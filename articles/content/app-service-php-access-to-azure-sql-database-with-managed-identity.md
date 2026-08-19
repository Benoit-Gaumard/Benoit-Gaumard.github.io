+++
author = "Benoit G"
title = "App Service (PHP) Access to Azure SQL Database with Managed Identity"
date = "2025-02-12"
description = "Connect a PHP app running on Azure App Service to Azure SQL Database using a system-assigned managed identity, with no stored username or password."
tags = ["Database", "Security", "PHP"]
categories = ["Azure"]
featureImage = "/articles/images/SQL-Database.svg"
+++

You can connect to your Azure SQL Database or Azure Database for MySQL using a managed identity in PHP. This approach removes the necessity of storing usernames and passwords in your code. Authentication is managed by Entra ID, previously known as Azure Active Directory (AAD).

![Managed identity authentication architecture](https://learn.microsoft.com/en-us/azure/app-service/media/tutorial-connect-msi-sql-database/architecture.png)

See also: [How to access Azure SQL Database with managed identity in PHP in App Service](https://techcommunity.microsoft.com/blog/appsonazureblog/how-to-access-azure-sql-database-with-managed-identity-in-php-in-app-service/4129014)

[[toc]]

## Enable managed identity for your app service

If using Azure App Service (Web App): go to **Azure Portal → Your App Service → Identity → Enable System-assigned identity**.

## Assign database permissions

After enabling managed identity, you need to grant it access to your Azure database.

For Azure SQL Database, connect to your SQL Server using Azure Data Studio or SQL Server Management Studio (SSMS), then run the following SQL commands to create an AAD user and assign roles:

```sql
-- Create the managed identity as an Azure AD user
CREATE USER [your-managed-identity-name] FROM EXTERNAL PROVIDER;

-- Grant permissions (adjust based on needs)
ALTER ROLE db_datareader ADD MEMBER [your-managed-identity-name];
ALTER ROLE db_datawriter ADD MEMBER [your-managed-identity-name];
ALTER ROLE db_owner ADD MEMBER [your-managed-identity-name]; -- Only if full access is needed
```

To display external providers already created:

```sql
-- SID to OBJECTID
SELECT
    DP.name,
    DP.principal_id,
    DP.type,
    DP.type_desc,
    DP.SID,
    OBJECTID = CONVERT(uniqueidentifier, DP.SID)
FROM SYS.database_principals DP
WHERE DP.type IN ('S', 'X', 'E')
```

Replace `your-managed-identity-name` with the actual name of your managed identity — usually the web app name.

## Connect to Azure SQL Database with PDO

PDO (PHP Data Objects) is a database access layer in PHP that provides a uniform and secure way to interact with different databases (MySQL, PostgreSQL, SQL Server, SQLite, etc.).

```php
$azureServer = 'myazureserver.database.windows.net';
$azureDatabase = 'myazuredatabase';
$connectionInfo = array(
    'Database' => $azureDatabase,
    'Authentication' => 'ActiveDirectoryMsi'
);
$conn = sqlsrv_connect($azureServer, $connectionInfo);

if ($conn === false) {
    echo "Could not connect with Authentication=ActiveDirectoryMsi (system-assigned).\n";
    print_r(sqlsrv_errors());
} else {
    echo "Connected successfully with Authentication=ActiveDirectoryMsi (system-assigned).\n";

    $tsql = "SELECT @@Version AS SQL_VERSION";
    $stmt = sqlsrv_query($conn, $tsql);
    if ($stmt === false) {
        echo "Failed to run the simple query (system-assigned).\n";
        print_r(sqlsrv_errors());
    } else {
        while ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
            echo $row['SQL_VERSION'] . PHP_EOL;
        }
        sqlsrv_free_stmt($stmt);
    }
    sqlsrv_close($conn);
}
```

## To conclude

Using a managed identity to connect your frontend application (web app) to your backend SQL database eliminates the need for hardcoded usernames and passwords. This approach enhances security by leveraging Azure's identity management, ensuring that credentials are automatically managed and rotated.

Advantages of using managed identity:

- No hardcoded credentials in code.
- Automatically rotates tokens for security.
- Works across Azure services (VMs, App Service, Functions, etc.).
