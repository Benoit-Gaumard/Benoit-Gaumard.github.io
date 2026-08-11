az login --use-device-code

az account set --subscription "<subscription-id>"

az deployment sub validate --location "northeurope" --template-file .\00-main.bicep
az deployment sub validate --location "westeurope" --template-file .\00-main.bicep --parameters @parameters-dev.json

bicep --version

az bicep install
az bicep upgrade