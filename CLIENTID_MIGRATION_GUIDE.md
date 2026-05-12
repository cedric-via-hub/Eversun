# 🔐 Guide d'assurance que tous les clients ont un ID unique

## Vue d'ensemble

J'ai mis en place un système complet pour s'assurer que tous les ID Client sont bien enregistrés dans toutes les démarches:

### Améliorations apportées:

1. **clientId maintenant obligatoire**: Le champ `clientId` est maintenant `required: true` dans le modèle de données
2. **Génération automatique**: Un `clientId` unique est automatiquement généré pour chaque nouveau client
3. **Préservation garantie**: Lors de chaque mise à jour, le `clientId` est préservé même s'il n'est pas fourni dans la requête
4. **Copies cross-sections**: Quand un client est copié vers une autre section, le même `clientId` est utilisé
5. **Migration des anciens clients**: Un endpoint et un script permettent de migrer les anciens clients sans `clientId`

## Nouvelles Endpoints API

### Vérifier le statut de migration
```bash
GET /api/clients/migrate
```

Réponse:
```json
{
  "totalClients": 150,
  "clientsWithoutId": 5,
  "clientsWithId": 145,
  "migrationNeeded": true
}
```

### Exécuter la migration
```bash
POST /api/clients/migrate
```

Réponse:
```json
{
  "success": true,
  "message": "Migration complétée: 5 clients mis à jour",
  "updated": [
    {
      "_id": "...",
      "client": "Nom du client",
      "section": "dp-en-cours",
      "clientId": "EV-00..."
    }
  ],
  "errors": [],
  "totalProcessed": 5
}
```

## Utilisation

### Option 1: Via l'API (recommandé en production)

#### 1. Vérifier le statut
```bash
curl http://localhost:3000/api/clients/migrate
```

#### 2. Exécuter la migration si besoin
```bash
curl -X POST http://localhost:3000/api/clients/migrate
```

### Option 2: Via le script Node.js (recommandé en développement)

```bash
# Exécuter le script
node scripts/migrate-clientids.js
```

Le script va:
- Se connecter à MongoDB
- Trouver tous les clients sans `clientId`
- Générer un `clientId` unique pour chacun
- Afficher le résumé des migrations
- Fermer la connexion

## Structure des clientIds

Les nouveaux `clientId` suivent le format: `EV-00{timestamp}-{random9chars}`

Exemple: `EV-001715500234567-ABCDEF123`

## Garanties de cohérence

### Lors de la création d'un client:
- ✅ Un `clientId` unique est généré automatiquement
- ✅ Les espaces inutiles sont supprimés (`trim()`)

### Lors de la mise à jour d'un client:
- ✅ Le `clientId` existant est toujours préservé
- ✅ Impossible de modifier le `clientId` une fois créé
- ✅ Quand un client est copié vers une autre section, le même `clientId` est utilisé

### Lors du nettoyage des doublons:
- ✅ Les doublons sont identifiés par `clientId` ou par `client`
- ✅ Seul le document le plus récent est conservé

## Vérification

Pour vérifier que tous les clients ont un `clientId`:

```bash
# Via curl
curl http://localhost:3000/api/clients/migrate

# Vous devriez voir:
# "clientsWithoutId": 0
# "migrationNeeded": false
```

## Aide supplémentaire

Si vous rencontrez des problèmes lors de la migration, vérifiez:

1. ✅ MongoDB est accessible via `MONGODB_URI` dans `.env.local`
2. ✅ Le serveur n'est pas en train de traiter d'autres migrations
3. ✅ Les permissions de base de données permettent les updates

Pour plus d'informations, consultez les logs du serveur.
