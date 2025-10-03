# Klyra Recipes API Reference

Complete API documentation for the Klyra Recipes module with CRUD operations, workflow actions, and advanced search.

---

## Authentication

All endpoints require authentication. Include auth session cookies in requests.

---

## Recipes

### List Recipes (with advanced search/filters)

```http
GET /api/v1/recipes
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `locationId` | UUID | Filter by location |
| `status` | enum | Filter by status: `draft`, `submitted`, `published`, `archived` |
| `category` | string | Filter by category |
| `cuisineType` | string | Filter by cuisine type |
| `search` | string | Full-text search on title/description |
| `includeItems` | UUID[] | Comma-separated item IDs (recipes WITH these ingredients) |
| `excludeItems` | UUID[] | Comma-separated item IDs (recipes WITHOUT these ingredients) |
| `allergens` | string[] | Comma-separated allergen tags |
| `season` | enum | Filter by season: `spring`, `summer`, `fall`, `winter` |
| `tags` | string[] | Comma-separated custom tags |
| `minServings` | int | Minimum servings |
| `maxServings` | int | Maximum servings |
| `maxPrepTime` | int | Max prep time in minutes |
| `maxCookTime` | int | Max cook time in minutes |
| `favoritesOnly` | boolean | Show only favorites |
| `limit` | int | Results per page (default: 50, max: 100) |
| `offset` | int | Pagination offset (default: 0) |

**Response:**

```json
{
  "recipes": [
    {
      "id": "uuid",
      "title": "Carbonara Romana",
      "description": "...",
      "category": "main_course",
      "cuisine_type": "italian",
      "status": "published",
      "servings": 4,
      "prep_time_minutes": 15,
      "cook_time_minutes": 20,
      "total_time_minutes": 35,
      "photo_url": "https://...",
      "allergens": ["eggs", "dairy"],
      "season": ["fall", "winter"],
      "tags": ["pasta", "quick"],
      "view_count": 142,
      "clone_count": 8,
      "is_favorite": true,
      "ingredient_count": 6,
      "steps_count": 5,
      "created_at": "2025-10-01T10:00:00Z",
      "created_by_profile": { "full_name": "Mario Rossi" },
      "location": { "name": "Ristorante Centro" },
      "recipe_ingredients": [...],
      "recipe_steps": [...]
    }
  ],
  "pagination": {
    "total": 142,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

**Example Requests:**

```bash
# All published recipes in location
GET /api/v1/recipes?locationId=abc123&status=published

# Search text + filters
GET /api/v1/recipes?search=carbonara&category=main_course&maxCookTime=30

# Recipes with/without specific items
GET /api/v1/recipes?includeItems=item1,item2&excludeItems=item3

# My favorites only
GET /api/v1/recipes?favoritesOnly=true
```

---

### Create Recipe

```http
POST /api/v1/recipes
```

**Request Body:**

```json
{
  "org_id": "uuid",
  "location_id": "uuid",
  "title": "Carbonara Romana",
  "description": "Ricetta tradizionale romana...",
  "category": "main_course",
  "cuisine_type": "italian",
  "servings": 4,
  "prep_time_minutes": 15,
  "cook_time_minutes": 20,
  "photo_url": "https://...",
  "allergens": ["eggs", "dairy"],
  "season": ["fall", "winter"],
  "tags": ["pasta", "quick", "traditional"],
  "ingredients": [
    {
      "catalog_item_id": "uuid",
      "quantity": 320,
      "unit": "g",
      "item_name_snapshot": "Spaghetti",
      "is_optional": false,
      "notes": "Di grano duro",
      "sort_order": 0
    }
  ],
  "steps": [
    {
      "step_number": 1,
      "title": "Preparazione guanciale",
      "instruction": "Tagliare il guanciale a listarelle...",
      "timer_minutes": 5,
      "checklist_items": ["Taglio uniforme", "Rimozione cotenna"],
      "photo_url": "https://..."
    }
  ]
}
```

**Response:** `201 Created`

```json
{
  "recipe": { /* complete recipe object */ }
}
```

---

### Get Recipe Detail

```http
GET /api/v1/recipes/:id
```

**Response:**

```json
{
  "recipe": {
    /* ...all recipe fields... */
    "can_edit": true,
    "can_submit": true,
    "can_publish": false,
    "can_archive": false,
    "recipe_ingredients": [...],
    "recipe_steps": [...],
    "recipe_service_notes": [...]
  }
}
```

---

### Update Recipe

```http
PATCH /api/v1/recipes/:id
```

**Note:** Can only update `draft` recipes.

**Request Body:** (partial update)

```json
{
  "title": "Carbonara Romana Autentica",
  "photo_url": "https://...",
  "tags": ["pasta", "traditional", "roman"]
}
```

---

### Delete Recipe

```http
DELETE /api/v1/recipes/:id
```

**Note:** Can only delete `draft` recipes. Performs soft delete (sets `is_active=false`).

---

## Workflow Actions

### Submit Recipe for Approval

```http
POST /api/v1/recipes/:id/submit
```

Transitions: `draft` → `submitted`

**Response:**

```json
{
  "recipe": { /* updated recipe */ },
  "message": "Recipe submitted for approval"
}
```

---

### Publish Recipe

```http
POST /api/v1/recipes/:id/publish
```

Transitions: `submitted` → `published`

**Requirements:**
- Recipe must have `photo_url` (mandatory for publishing)
- User must have Manager/Org Admin permissions

**Response:**

```json
{
  "recipe": { /* updated recipe */ },
  "message": "Recipe has been published"
}
```

**Error (no photo):**

```json
{
  "error": "Cannot publish recipe without a photo. Please upload a photo first."
}
```

---

### Archive Recipe

```http
POST /api/v1/recipes/:id/archive
```

Transitions: any → `archived`

**Requirements:** Manager/Org Admin permissions

---

## Ingredients

### Add Ingredient

```http
POST /api/v1/recipes/:id/ingredients
```

**Request Body:**

```json
{
  "catalog_item_id": "uuid",
  "quantity": 320,
  "unit": "g",
  "item_name_snapshot": "Spaghetti",
  "is_optional": false,
  "notes": "Di grano duro",
  "sort_order": 0
}
```

---

### Update Ingredient

```http
PATCH /api/v1/recipes/:id/ingredients/:ingredientId
```

**Request Body:** (partial)

```json
{
  "quantity": 400,
  "unit": "g"
}
```

---

### Remove Ingredient

```http
DELETE /api/v1/recipes/:id/ingredients/:ingredientId
```

---

## Steps

### Add Step

```http
POST /api/v1/recipes/:id/steps
```

**Request Body:**

```json
{
  "step_number": 3,
  "title": "Mantecatura finale",
  "instruction": "Spegnere il fuoco e mescolare velocemente...",
  "timer_minutes": 2,
  "checklist_items": ["Fuoco spento", "Mescolamento rapido"],
  "photo_url": "https://..."
}
```

---

### Update Step

```http
PATCH /api/v1/recipes/:id/steps/:stepId
```

---

### Remove Step

```http
DELETE /api/v1/recipes/:id/steps/:stepId
```

---

## Service Notes

### Add Service Note

```http
POST /api/v1/recipes/:id/service-notes
```

**Request Body:**

```json
{
  "note_text": "Servire immediatamente, il piatto non tollera l'attesa"
}
```

**Response:**

```json
{
  "note": {
    "id": "uuid",
    "note_text": "...",
    "created_by": "uuid",
    "created_at": "2025-10-03T...",
    "created_by_profile": {
      "full_name": "Mario Rossi",
      "avatar_url": "..."
    }
  }
}
```

---

## Favorites

### Toggle Favorite

```http
POST /api/v1/recipes/:id/favorite
```

**Response:**

```json
{
  "is_favorite": true
}
```

---

### Remove Favorite (explicit)

```http
DELETE /api/v1/recipes/:id/favorite
```

---

## Clone Recipe

### Clone Recipe as Draft

```http
POST /api/v1/recipes/:id/clone
```

Creates a copy of the recipe (with ingredients and steps) as a new `draft` with title suffixed `(Copy)`.

**Response:**

```json
{
  "recipe": { /* cloned recipe */ },
  "message": "Recipe 'Carbonara Romana' cloned successfully"
}
```

---

## Permissions Summary

| Action | Allowed Users |
|--------|---------------|
| View `published` recipes | All users in org/location |
| View own `draft` recipes | Creator |
| View any recipe | Manager/Org Admin |
| Create `draft` | All users in org/location |
| Update `draft` | Creator or Manager/Org Admin |
| Delete `draft` | Creator or Manager/Org Admin |
| Submit for approval | Creator of `draft` |
| Publish recipe | Manager/Org Admin (only if `photo_url` set) |
| Archive recipe | Manager/Org Admin |
| Add/edit ingredients/steps | Creator of `draft` or Manager/Org Admin |
| Add service notes | All users in org/location |
| Toggle favorites | All users |
| Clone recipe | All users (creates own draft) |

---

## Error Responses

All endpoints follow consistent error format:

```json
{
  "error": "Human-readable error message",
  "details": [ /* optional validation errors */ ]
}
```

**Common HTTP Status Codes:**
- `400` - Bad Request (validation error, invalid state transition)
- `401` - Unauthorized (not authenticated)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (recipe/resource not found)
- `500` - Internal Server Error

---

## Validation Rules

### Recipe
- `title`: 1-200 chars (required)
- `category`: enum (required)
- `servings`: 1-1000 (default: 4)
- `prep_time_minutes`: 0-1440 (default: 0)
- `cook_time_minutes`: 0-1440 (default: 0)
- `photo_url`: valid URL (optional, but **required for publishing**)

### Ingredient
- `catalog_item_id`: valid UUID (required)
- `quantity`: >= 0 (required)
- `unit`: non-empty string (required)

### Step
- `step_number`: >= 1 (required)
- `instruction`: non-empty string (required)
- `timer_minutes`: >= 0 (optional)

### Service Note
- `note_text`: 1-1000 chars (required)

---

## Advanced Search Examples

**1. Find vegetarian pasta recipes under 30 minutes:**

```bash
GET /api/v1/recipes?search=pasta&excludeItems=meat-uuid,fish-uuid&maxCookTime=30
```

**2. All published winter desserts in Rome location:**

```bash
GET /api/v1/recipes?locationId=rome-uuid&category=dessert&season=winter&status=published
```

**3. My draft recipes with allergen-free option:**

```bash
GET /api/v1/recipes?status=draft&allergens=none
```

**4. Clone popular recipe (>50 views):**

```bash
# First search
GET /api/v1/recipes?status=published&sort=view_count

# Then clone
POST /api/v1/recipes/{popular-recipe-id}/clone
```

---

## Rate Limiting

API uses standard rate limiting patterns:
- Standard users: 100 req/min
- Admin users: 500 req/min

---

## Changelog

**v1.0.0** (2025-10-03)
- Initial release
- CRUD operations for recipes, ingredients, steps, service notes
- Workflow: draft → submitted → published → archived
- Advanced search with full-text + filters
- Include/exclude items filters
- Favorites system
- Clone functionality
- Zod validation on all endpoints
