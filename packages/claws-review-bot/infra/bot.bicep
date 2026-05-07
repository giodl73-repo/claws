// bot.bicep — claws-review-bot Container Apps Job + KeyVault + Managed Identity.
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

@description('Anthropic API key (will be stored in KeyVault)')
@secure()
param anthropicApiKey string

@description('Container image (built and pushed separately)')
param containerImage string = 'ghcr.io/giodl-ms/claws-review-bot:latest'

@description('Repos to poll, comma-separated (e.g. "bic/lobster")')
param watchRepos string = 'bic/lobster'

@description('Polling interval in minutes')
param pollIntervalMinutes int = 10

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

// ---- Log Analytics ----

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: '${botName}-logs'
  location: location
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 30
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

resource anthropicSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyvault
  name: 'anthropic-api-key'
  properties: { value: anthropicApiKey }
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
          name: 'anthropic-api-key'
          keyVaultUrl: anthropicSecret.properties.secretUri
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
            '--post'
          ]
          env: [
            { name: 'GH_HOST', value: 'microsoft.ghe.com' }
            { name: 'GH_TOKEN', secretRef: 'ghe-pat' }
            { name: 'ANTHROPIC_API_KEY', secretRef: 'anthropic-api-key' }
          ]
        }
      ]
    }
  }
}

output jobName string = job.name
output keyvaultName string = keyvault.name
output identityClientId string = identity.properties.clientId
