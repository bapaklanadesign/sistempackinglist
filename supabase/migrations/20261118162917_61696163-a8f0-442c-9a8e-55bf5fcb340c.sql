REVOKE EXECUTE ON FUNCTION public.bootstrap_super_admin(text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
CREATE INDEX IF NOT EXISTS pl_packing_lists_consignee_id_idx ON public.pl_packing_lists (consignee_id);
CREATE INDEX IF NOT EXISTS pl_packing_lists_shipper_id_idx ON public.pl_packing_lists (shipper_id);
CREATE INDEX IF NOT EXISTS pl_packing_lists_origin_port_id_idx ON public.pl_packing_lists (origin_port_id);
CREATE INDEX IF NOT EXISTS pl_packing_lists_destination_port_id_idx ON public.pl_packing_lists (destination_port_id);
CREATE INDEX IF NOT EXISTS transactions_import_id_idx ON public.transactions (import_id);