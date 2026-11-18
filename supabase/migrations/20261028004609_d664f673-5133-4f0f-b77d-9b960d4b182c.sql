CREATE OR REPLACE FUNCTION public.delete_transaction(p_id uuid, p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE old_row public.transactions; paired public.transactions; is_super boolean; transfer_key uuid; target_ids uuid[];
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Tidak terautentikasi'; END IF;
  is_super := public.has_role(auth.uid(), 'super_admin');
  IF p_reason IS NULL OR char_length(trim(p_reason)) < 5 THEN RAISE EXCEPTION 'Alasan penghapusan wajib diisi (minimal 5 karakter)'; END IF;
  SELECT transfer_id INTO transfer_key FROM public.transactions WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transaksi tidak ditemukan'; END IF;
  -- Acquire both rows in the same order even when callers select opposite transfer sides.
  IF transfer_key IS NOT NULL THEN
    PERFORM id FROM public.transactions WHERE transfer_id = transfer_key ORDER BY id FOR UPDATE;
  END IF;
  SELECT * INTO old_row FROM public.transactions WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transaksi tidak ditemukan'; END IF;
  IF NOT is_super AND old_row.ledger IS DISTINCT FROM public.current_ledger() THEN RAISE EXCEPTION 'Tidak memiliki akses ke transaksi ini'; END IF;
  IF old_row.tx_type IN ('transfer_in', 'transfer_out') OR old_row.transfer_id IS NOT NULL THEN
    IF old_row.transfer_id IS NULL OR old_row.transfer_id IS DISTINCT FROM transfer_key THEN RAISE EXCEPTION 'Pasangan transfer tidak valid'; END IF;
    SELECT array_agg(id ORDER BY id) INTO target_ids FROM public.transactions WHERE transfer_id = old_row.transfer_id;
    IF array_length(target_ids, 1) IS DISTINCT FROM 2 THEN RAISE EXCEPTION 'Pasangan transfer tidak lengkap'; END IF;
    SELECT * INTO paired FROM public.transactions WHERE transfer_id = old_row.transfer_id AND id <> old_row.id;
    IF paired.ledger IS DISTINCT FROM old_row.ledger OR paired.amount IS DISTINCT FROM old_row.amount
      OR paired.tx_date IS DISTINCT FROM old_row.tx_date OR paired.account_id = old_row.account_id
      OR NOT ((old_row.tx_type = 'transfer_in' AND paired.tx_type = 'transfer_out') OR (old_row.tx_type = 'transfer_out' AND paired.tx_type = 'transfer_in')) THEN
      RAISE EXCEPTION 'Pasangan transfer tidak valid';
    END IF;
  ELSE
    target_ids := ARRAY[old_row.id];
  END IF;
  INSERT INTO public.audit_logs (transaction_id, ledger, actor_id, action, before_data, reason, result)
    SELECT id, ledger, auth.uid(), 'delete', to_jsonb(t), trim(p_reason), 'success' FROM public.transactions t WHERE id = ANY(target_ids);
  DELETE FROM public.transactions WHERE id = ANY(target_ids);
END;
$$;
REVOKE ALL ON FUNCTION public.delete_transaction(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_transaction(uuid, text) TO authenticated;