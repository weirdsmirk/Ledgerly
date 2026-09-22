  const createAccountInline = async () => {
    setAccError(null);
    if (!accName.trim()) { setAccError('Account name is required'); return; }
    try {
      const created = await api.createAccount({ name: accName.trim(), type: accType });
      await accounts.reload();
      if (created?.id) setAccountId(String(created.id));
      toasts.push(`Account \"${accName.trim()}\" created`);
      setAccFormOpen(false);
      setAccName('');
      setAccType('checking');
    } catch (err) {
      setAccError(err instanceof Error ? err.message : 'Create failed');
    }
  };

  return (
    <>
      <ToastHost toasts={toasts.toasts} />
      <Modal open={open} onClose={onClose} title={isEdit ? 'Edit transaction' : 'Add transaction'} kicker="New entry">