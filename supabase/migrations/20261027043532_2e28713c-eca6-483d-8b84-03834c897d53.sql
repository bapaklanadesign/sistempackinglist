REVOKE EXECUTE ON FUNCTION public.create_transaction(public.ledger, uuid, date, text, public.tx_type, numeric, text, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.delete_transaction(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.create_bank_account(public.ledger, text, numeric, integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.update_bank_account(uuid, text, integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.delete_bank_account(uuid) FROM anon, public;