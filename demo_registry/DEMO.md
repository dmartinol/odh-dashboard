# MCP Registry Demo on Openshift

## Setup Toolhive
Note: in case, build operator image for `amd64` platform:
```
PLATFORM=linux/amd64 task build-operator-image-ubi
```

**Note**: I had to build a custom image because of some last-minutes issues I had to fix, otherwise the CR does not properly deploy the server:
https://github.com/stacklok/toolhive/pull/2914 (still open, I think the team expects me to fix all the feature, but I won't do that, not my daily goal)

Install CRDs (assuming repos are installed from the same parent folder):
```
helm upgrade --install toolhive-operator-crds ../../toolhive/deploy/charts/operator-crds --namespace toolhive-system \
--create-namespace
oc get crd | grep mcp
```

Uninstall the operator (if needed:
```
helm uninstall toolhive-operator
```

Install the operator from values in current folder:
```
helm upgrade --install toolhive-operator ../../toolhive/deploy/charts/operator --namespace toolhive-system \
--create-namespace \
--values ./values-openshift.yaml
oc get pods -w
```
(these values mainly override the runtime images)


List installed charts:
```
helm list
```

## Setup and deploy Postgres
Prerequisites:
- Install `CloudNativePG` operator (namespace only)

Verify CRDs:
```
oc get crd | grep postgres
```

Delete demo DB:
```
oc delete clusters.postgresql.cnpg.io demo-db
```

Install demo DB:
```
oc apply -f psql.yaml
oc get pods -w
```

**Long Note**: ToolHive registry requires 2 distinct passwords for the app and the migratio user, and the suggested approach is to use
a pgpassfile to define all the passwords. It should include something like:
```
#   localhost:5432:toolhive_registry:thv_user:your_app_password
#   localhost:5432:toolhive_registry:thv_migrator:your_migration_password
```
Since the operator does not explicitly manage this `pgpassfile`, the alternative would be to generate a verbose init container in the `MCPRegistry` specs, to include something like:
```yaml
      - name: pgpass-fixer
        image: alpine:3
        command:
        - /bin/sh
        - -c
        - cp /cfg/* /etc/ && chmod 0600 /etc/pgpass && chown 65532:65532 /etc/pgpass
        volumeMounts:
        - name: etc
          mountPath: /etc
        - name: config
          mountPath: /cfg/config.yaml
          subPath: config.yaml
        - name: pgpass
          mountPath: /cfg/pgpass
          subPath: pgpass
```
(and I omitted the other steps to mount the `pgpass` volume).

Instead of that, I simply added an env variable to the deployment to specify the password:
```yaml
  podTemplateSpec:
    spec:
      containers:
        - name: registry-api
          env:
            - name: PGPASSWORD
              value: app_password
```
Since there can be a single `PGPASSWORD`, I finally used the same user for both the app and the migration.
```yaml
  databaseConfig:
    host: demo-db-rw.toolhive-system.svc.cluster.local
    port: 5432
    user: db_app
    # DIRTY TRICK TO USE ENV VAR FOR THE (SINGKLE) PASSWORD
    migrationUser: db_app
```

This is also reflected in the init script inside the `Database` resource:
```yaml
      postInitApplicationSQL:
        - |
          BEGIN;

          DO $body$
            DECLARE
              migrator_user TEXT := 'db_app';
              migrator_password TEXT := 'app_password';

              app_user TEXT := 'db_app';
              app_password TEXT := 'app_password';
...
```

## Deploy MCP registry
Catalog source is the ToolHive registry data from the git repo:
```
oc delete -f mcpregistry-git-toolhive.yaml
oc apply -f mcpregistry-git-toolhive.yaml
oc get mcpregistry
oc get pods -w
```
The manifest is a bit different from the original in the `toolhive` repo because of necessary fixes:
* Can't use `default` name in the registry (it's aready auto-assigned to a kubernetes registry created to watch `MCPServer` instances and discover servers)
* Added DB configuration


Verify service:
```
oc get svc
```

Test query
```
oc exec $(oc get pods -l app.kubernetes.io/component=registry-api -oname) -- curl http://localhost:8080/registry/v0.1/servers
```



