// bot.bicep — claws-review-bot Container Apps Job + KeyVault + Storage Account
// + role assignments. Backend: Azure OpenAI (existing clawcode-aoai resource).
//
// Deploy:
//   az deployment group create \
//     --resource-group claws-review-bot-rg \
//     --template-file infra/bot.bicep \
//     --parameters @infra/bot.parameters.json

@description('Location for all resources')
param location string = resourceGroup().location

@description('Bot name prefix (used for resource naming)')
param botName string = 'claws-review-bot'

@description('GHE personal access token (will be stored in KeyVault)')
@secure()
param ghePat string

@description('Existing AOAI account resource group')
param aoaiResourceGroup string = 'rg-clawcode'

@description('Existing AOAI account name')
param aoaiAccountName string = 'clawcode-aoai'

@description('AOAI deployment name to use as the reviewer model')
param aoaiDeploymentName string = 'reviewer-gpt5'

@description('AOAI API version')
param aoaiApiVersion string = '2025-01-01-preview'

@description('Container image (built and pushed separately)')
param containerImage string = 'ghcr.io/giodl-ms/claws-review-bot:latest'

@description('Repos to poll, comma-separated (e.g. "bic/lobster")')
param watchRepos string = 'bic/lobster'

@description('Polling interval in minutes')
param pollIntervalMinutes int = 10

@description('Whether the bot posts comments to PRs (false = dry-run, archive to Storage only)')
param postComments bool = false

// ---- Reference existing AOAI account (different RG) ----

resource aoaiAccount 'Microsoft.CognitiveServices/accounts@2024-10-01' existing = {
  name: aoaiAccountName
  scope: resourceGroup(aoaiResourceGroup)
}

// ---- Storage account for verdict archive ----

resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: replace('${botName}stg', '-', '')
  location: location
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
  properties: {
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
    publicNetworkAccess: 'Enabled'
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: storage
  name: 'default'
}

resource verdictsContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobService
  name: 'verdicts'
  properties: { publicAccess: 'None' }
}

// ---- Log Analytics ----

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: '${botName}-logs'
  location: location
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 30
  }
}

// ---- Container Apps Environment ----

resource env 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: '${botName}-env'
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
  }
}

// ---- Managed Identity ----

resource identity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: '${botName}-mi'
  location: location
}

// ---- KeyVault ----

resource keyvault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: '${botName}-kv'
  location: location
  properties: {
    sku: { family: 'A', name: 'standard' }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
    enabledForDeployment: false
    enabledForTemplateDeployment: true
    enabledForDiskEncryption: false
    softDeleteRetentionInDays: 7
    enablePurgeProtection: true
  }
}

resource gheSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyvault
  name: 'ghe-pat'
  properties: { value: ghePat }
}

resource aoaiSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyvault
  name: 'aoai-api-key'
  properties: { value: aoaiAccount.listKeys().key1 }
}

resource storageSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyvault
  name: 'storage-connection-string'
  properties: {
    value: 'DefaultEndpointsProtocol=https;AccountName=${storage.name};AccountKey=${storage.listKeys().keys[0].value};EndpointSuffix=${environment().suffixes.storage}'
  }
}

// ---- KeyVault Secrets User role for the managed identity ----

resource kvSecretsUserRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: keyvault
  name: guid(keyvault.id, identity.id, '4633458b-17de-408a-b874-0445c86b69e6')
  properties: {
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      '4633458b-17de-408a-b874-0445c86b69e6'  // Key Vault Secrets User
    )
    principalId: identity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

// ---- Container Apps Job ----

resource job 'Microsoft.App/jobs@2024-03-01' = {
  name: '${botName}-job'
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: { '${identity.id}': {} }
  }
  properties: {
    environmentId: env.id
    configuration: {
      triggerType: 'Schedule'
      replicaTimeout: 1800  // 30 min — kill long reviews
      replicaRetryLimit: 1
      scheduleTriggerConfig: {
        cronExpression: '*/${pollIntervalMinutes} * * * *'
        parallelism: 1
        replicaCompletionCount: 1
      }
      secrets: [
        {
          name: 'ghe-pat'
          keyVaultUrl: gheSecret.properties.secretUri
          identity: identity.id
        }
        {
          name: 'aoai-api-key'
          keyVaultUrl: aoaiSecret.properties.secretUri
          identity: identity.id
        }
        {
          name: 'storage-connection-string'
          keyVaultUrl: storageSecret.properties.secretUri
          identity: identity.id
        }
      ]
    }
    template: {
      containers: [
        {
          name: botName
          image: containerImage
          resources: { cpu: json('0.5'), memory: '1Gi' }
          args: [
            'poll'
            '--repo'
            watchRepos
            '--once'  // Cron triggers each invocation; run once per fire and exit
          ]
          env: [
            { name: 'GH_HOST', value: 'microsoft.ghe.com' }
            { name: 'GH_TOKEN', secretRef: 'ghe-pat' }
            { name: 'LLM_BACKEND', value: 'azure-openai' }
            { name: 'AOAI_ENDPOINT', value: aoaiAccount.properties.endpoint }
            { name: 'AOAI_DEPLOYMENT', value: aoaiDeploymentName }
            { name: 'AOAI_API_VERSION', value: aoaiApiVersion }
            { name: 'AOAI_API_KEY', secretRef: 'aoai-api-key' }
            { name: 'STORAGE_CONNECTION_STRING', secretRef: 'storage-connection-string' }
            { name: 'STORAGE_CONTAINER', value: 'verdicts' }
            // POST_COMMENTS toggle: false = archive to Storage only (dry-run);
            // true = also post to PR. Flip via:
            //   az containerapp job update -n claws-review-bot-job \
            //     -g <rg> --set-env-vars POST_COMMENTS=true
            { name: 'POST_COMMENTS', value: postComments ? 'true' : 'false' }
          ]
        }
      ]
    }
  }
}

output jobName string = job.name
output keyvaultName string = keyvault.name
output storageAccountName string = storage.name
output verdictsContainerUrl string = '${storage.properties.primaryEndpoints.blob}verdicts'
output identityClientId string = identity.properties.clientId
output aoaiEndpoint string = aoaiAccount.properties.endpoint
