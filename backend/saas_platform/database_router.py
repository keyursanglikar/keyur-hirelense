class ModuleDatabaseRouter:
    """
    A router to control all database operations on models in the
    ca-saas-platform.
    """

    # Map application labels to their respective database names
    app_db_map = {
        'modules.fee_estimation.backend': 'fee_estimation',
        'modules.ca_tools.backend': 'ca_tools',
        'modules.hirelens.backend': 'hirelens',
    }

    def db_for_read(self, model, **hints):
        """
        Attempts to read module models go to their isolated database.
        """
        app_label = model._meta.app_label
        # Note: In Django, app_label is usually just 'backend' if not configured properly.
        # We must ensure each module's apps.py defines `name = 'modules.X.backend'`
        if app_label in self.app_db_map:
            return self.app_db_map[app_label]
        return 'default'

    def db_for_write(self, model, **hints):
        """
        Attempts to write module models go to their isolated database.
        """
        app_label = model._meta.app_label
        if app_label in self.app_db_map:
            return self.app_db_map[app_label]
        return 'default'

    def allow_relation(self, obj1, obj2, **hints):
        """
        Allow relations if a model in the same isolated DB is involved.
        We do NOT allow true ForeignKeys across different databases.
        Cross-DB relationships must use IntegerFields (e.g., central_firm_id).
        """
        db_obj1 = self.app_db_map.get(obj1._meta.app_label, 'default')
        db_obj2 = self.app_db_map.get(obj2._meta.app_label, 'default')
        if db_obj1 == db_obj2:
            return True
        return False

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        """
        Make sure the module apps only appear in their related database.
        """
        if app_label in self.app_db_map:
            return db == self.app_db_map[app_label]
        
        # Core apps should only migrate into the default database
        return db == 'default'
