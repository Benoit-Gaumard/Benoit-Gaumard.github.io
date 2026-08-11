+++
author = "Benoit G"
title = "App Service (PHP) access to Azure SQL database with managed identity"
date = "2025-02-12"
description = ""
toc = false
draft = false
tags = [
    "Database", "Security", "PHP"
]
categories = ["Azure"]
featureImage = "/images/SQL-Database.svg" # Sets featured image on blog post.
featureImageAlt = 'Draw.io VSCode Extension' # Alternative text for featured image.
#featureImageCap = 'This is the featured image.' # Caption (optional).
thumbnail = "/images/SQL-Database.svg" # Sets thumbnail image appearing inside card on homepage.
shareImage = "/images/SQL-Database.svg" # Designate a separate image for social media sharing.
codeMaxLines = 10 # Override global value for how many lines within a code block before auto-collapsing.
codeLineNumbers = false # Override global value for showing of line numbers within code block.
figurePositionShow = true # Override global value for showing the figure label.
+++

You can connect to your Azure SQL Database or Azure Database for MySQL using a Managed Identity in PHP. This approach removes the necessity of storing usernames and passwords in your code. Authentication is managed by Entra ID, previously known as Azure Active Directory (AAD).
<!--more-->

![](https://learn.microsoft.com/en-us/azure/app-service/media/tutorial-connect-msi-sql-database/architecture.png)

https://techcommunity.microsoft.com/blog/appsonazureblog/how-to-access-azure-sql-database-with-managed-identity-in-php-in-app-service/4129014


## Enable Managed Identity for Your App Service
---
If using Azure App Service (Web App): Go to Azure Portal → Your App Service → Identity → Enable System-assigned identity.

## Assign Database Permissions
---

After enabling Managed Identity, you need to grant it access to your Azure database.

For Azure SQL Database, connect to your SQL Server using Azure Data Studio or SQL Server Management Studio (SSMS).

Run the following SQL commands to create an AAD user and assign roles:

```SQL
-- Create the Managed Identity as an Azure AD user
CREATE USER [your-managed-identity-name] FROM EXTERNAL PROVIDER;

-- Grant permissions (adjust based on needs)
ALTER ROLE db_datareader ADD MEMBER [your-managed-identity-name];
ALTER ROLE db_datawriter ADD MEMBER [your-managed-identity-name];
ALTER ROLE db_owner ADD MEMBER [your-managed-identity-name]; -- Only if full access is needed
```

To dispaly external providers created:

```SQL
--SID to OBJECTID
SELECT
	DP.name
	,DP.principal_id
	,DP.type
	,DP.type_desc
	,DP.SID
	,OBJECTID = CONVERT(uniqueidentifier, DP.SID)
FROM SYS.database_principals DP
WHERE DP.type IN ('S','X','E')
```

Replace your-managed-identity-name with the actual name of your managed identity.
Usually it is the Web App name

## Connect to Azure SQL Database with PDO
---

PDO (PHP Data Objects) is a database access layer in PHP that provides a uniform and secure way to interact with different databases (MySQL, PostgreSQL, SQL Server, SQLite, etc.).

```PHP
	$azureServer = 'myazureserver.database.windows.net';
	$azureDatabase = 'myazuredatabase';
	$connectionInfo = array('Database'=>$azureDatabase,
	                        'Authentication'=>'ActiveDirectoryMsi');
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
---

Using a managed identity to connect your frontend application (WebApp) to your backend SQL database eliminates the need for hardcoded usernames and passwords. This approach enhances security by leveraging Azure's identity management, ensuring that credentials are automatically managed and rotated.

🔥 Advantages of Using Managed Identity

✅ No hardcoded credentials in code.

✅ Automatically rotates tokens for security.

✅ Works across Azure services (VMs, App Service, Functions,etc).