# REST API CRUD - AmmarBook
## Testing dengan Thunder Client

### Base URL
```
http://localhost:3000
```

---

## 📚 ENDPOINTS

### 1. GET ALL BOOKS (dengan pagination, search, dan filter)
**Method:** `GET`  
**URL:** `http://localhost:3000/api/books`

**Query Parameters:**
| Parameter | Type | Required | Example | Keterangan |
|-----------|------|----------|---------|-----------|
| `search` | string | No | `"Harry"` | Cari berdasarkan title atau author |
| `status` | string | No | `"Tersedia"` | Filter status: `Semua`, `Tersedia`, `Dipinjam` |
| `page` | number | No | `1` | Nomor halaman (default: 1) |
| `limit` | number | No | `9` | Jumlah data per halaman (default: 9) |

**Example Request:**
```
GET http://localhost:3000/api/books?search=Harry&status=Tersedia&page=1&limit=9
```

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Harry Potter and the Philosopher's Stone",
      "author": "J.K. Rowling",
      "published_year": 1997,
      "status": "Tersedia"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 9,
    "total": 25,
    "totalPages": 3
  }
}
```

---

### 2. GET SINGLE BOOK BY ID
**Method:** `GET`  
**URL:** `http://localhost:3000/api/books/:id`

**Path Parameters:**
| Parameter | Type | Required | Example |
|-----------|------|----------|---------|
| `id` | number | Yes | `1` |

**Example Request:**
```
GET http://localhost:3000/api/books/1
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Harry Potter and the Philosopher's Stone",
    "author": "J.K. Rowling",
    "published_year": 1997,
    "status": "Tersedia"
  }
}
```

**Error Response (404):**
```json
{
  "success": false,
  "message": "Book not found"
}
```

---

### 3. CREATE NEW BOOK
**Method:** `POST`  
**URL:** `http://localhost:3000/api/books`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "title": "The Great Gatsby",
  "author": "F. Scott Fitzgerald",
  "published_year": 1925,
  "status": "Tersedia"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Book created successfully",
  "data": {
    "id": 26,
    "title": "The Great Gatsby",
    "author": "F. Scott Fitzgerald",
    "published_year": 1925,
    "status": "Tersedia"
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "Missing required fields: title, author, published_year, status"
}
```

---

### 4. UPDATE BOOK
**Method:** `PUT`  
**URL:** `http://localhost:3000/api/books/:id`

**Path Parameters:**
| Parameter | Type | Required | Example |
|-----------|------|----------|---------|
| `id` | number | Yes | `1` |

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):** *(minimal satu field wajib diisi)*
```json
{
  "title": "Harry Potter - Updated Title",
  "status": "Dipinjam"
}
```

Atau update semua field:
```json
{
  "title": "Harry Potter and the Philosopher's Stone",
  "author": "J.K. Rowling",
  "published_year": 1997,
  "status": "Tersedia"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Book updated successfully",
  "data": {
    "id": 1,
    "title": "Harry Potter - Updated Title",
    "author": "J.K. Rowling",
    "published_year": 1997,
    "status": "Dipinjam"
  }
}
```

**Error Response (404):**
```json
{
  "success": false,
  "message": "Book not found"
}
```

---

### 5. DELETE BOOK
**Method:** `DELETE`  
**URL:** `http://localhost:3000/api/books/:id`

**Path Parameters:**
| Parameter | Type | Required | Example |
|-----------|------|----------|---------|
| `id` | number | Yes | `1` |

**Example Request:**
```
DELETE http://localhost:3000/api/books/1
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Book deleted successfully",
  "data": {
    "id": 1,
    "title": "Harry Potter and the Philosopher's Stone",
    "author": "J.K. Rowling",
    "published_year": 1997,
    "status": "Tersedia"
  }
}
```

**Error Response (404):**
```json
{
  "success": false,
  "message": "Book not found"
}
```

---

## 🧪 TESTING CHECKLIST

- [ ] **GET All Books** - `GET /api/books`
- [ ] **GET All Books with Search** - `GET /api/books?search=Harry`
- [ ] **GET All Books with Filter** - `GET /api/books?status=Tersedia`
- [ ] **GET All Books with Pagination** - `GET /api/books?page=2&limit=5`
- [ ] **GET Single Book** - `GET /api/books/1`
- [ ] **CREATE Book** - `POST /api/books`
- [ ] **UPDATE Book** - `PUT /api/books/1`
- [ ] **DELETE Book** - `DELETE /api/books/1`

---

## 📝 NOTES

1. **Status Values:** Gunakan salah satu dari `"Tersedia"` atau `"Dipinjam"`
2. **Published Year:** Inputkan tahun sebagai angka (contoh: `1997`)
3. **Pagination:** Default page=1, limit=9
4. **Error Handling:** Semua response error akan include field `error` dengan detail error
5. **HTTP Status Codes:**
   - `200 OK` - Request berhasil
   - `201 Created` - Resource berhasil dibuat
   - `400 Bad Request` - Data input tidak valid
   - `404 Not Found` - Resource tidak ditemukan
   - `500 Internal Server Error` - Error server

---

## 🔧 SETUP Thunder Client

1. Buka Thunder Client di VS Code
2. Klik "Collections" → "+" untuk membuat collection baru
3. Nama: `AmmarBook API`
4. Di dalam collection, buat request baru untuk setiap endpoint
5. Copy-paste contoh dari dokumentasi ini ke Thunder Client
6. Ubah URL sesuai endpoint yang ingin di-test
7. Untuk POST/PUT, paste body JSON di tab "Body"
8. Klik "Send" untuk test

---

Generated: 2026-03-04
