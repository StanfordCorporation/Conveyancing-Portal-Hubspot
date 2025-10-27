# How to Use the HubSpot API Reference

## For Claude: Token-Efficient Usage Instructions

### File Location
`HUBSPOT_API_REFERENCE.md` - Comprehensive HubSpot API v3/v4 reference

### ⚠️ IMPORTANT: DO NOT Read the Entire File

The reference file is ~20KB and contains detailed API documentation. Reading it entirely wastes tokens.

### ✅ How to Use It Efficiently

#### Use Grep to Search Specific Sections

Instead of reading the file, search for what you need:

```bash
# Search for specific API endpoints
grep -A 20 "Create a Deal" HUBSPOT_API_REFERENCE.md

# Search for association types
grep -A 30 "Association Type IDs" HUBSPOT_API_REFERENCE.md

# Search for error handling
grep -A 15 "Error Handling" HUBSPOT_API_REFERENCE.md

# Search for specific object types
grep -A 50 "## Contacts API" HUBSPOT_API_REFERENCE.md
```

#### Common Search Patterns

**For Creating Objects:**
- Deals: `grep -A 25 "### Create a Deal" HUBSPOT_API_REFERENCE.md`
- Contacts: `grep -A 25 "### Create a Contact" HUBSPOT_API_REFERENCE.md`
- Companies: `grep -A 25 "### Create a Company" HUBSPOT_API_REFERENCE.md`
- Line Items: `grep -A 25 "### Create a Line Item" HUBSPOT_API_REFERENCE.md`

**For Associations:**
- Association IDs: `grep -A 50 "### HubSpot Defined Association Type IDs" HUBSPOT_API_REFERENCE.md`
- Create Association: `grep -A 20 "### Create an Association" HUBSPOT_API_REFERENCE.md`
- Batch Associations: `grep -A 30 "### Batch Create Associations" HUBSPOT_API_REFERENCE.md`

**For Searching Objects:**
- Search syntax: `grep -A 40 "### Search" HUBSPOT_API_REFERENCE.md`
- Search operators: `grep -A 15 "Search Operators" HUBSPOT_API_REFERENCE.md`

**For Batch Operations:**
- `grep -A 30 "Batch Operations - Deals" HUBSPOT_API_REFERENCE.md`
- `grep -A 30 "Batch Operations - Contacts" HUBSPOT_API_REFERENCE.md`

#### Table of Contents Search

If you need to see what sections are available:
```bash
grep -A 10 "## Table of Contents" HUBSPOT_API_REFERENCE.md
```

### Structure Overview

The file is organized into these main sections:

1. **Deals API** - All deal operations (create, read, update, delete, search, batch)
2. **Contacts API** - All contact operations
3. **Companies API** - All company operations
4. **Line Items API** - All line item operations
5. **Associations API** - v4 association endpoints
6. **Association Types** - Complete table of association type IDs
7. **Common Patterns** - Real-world usage examples
8. **Error Handling** - Error codes and retry logic

### Quick Reference Card (Always Available)

**Base URL:** `https://api.hubapi.com`

**Auth Header:** `Authorization: Bearer YOUR_ACCESS_TOKEN`

**Common Endpoints:**
- Deals: `/crm/v3/objects/deals`
- Contacts: `/crm/v3/objects/contacts`
- Companies: `/crm/v3/objects/companies`
- Line Items: `/crm/v3/objects/line_items`
- Associations: `/crm/v4/objects/{from}/{fromId}/associations/{to}/{toId}`

**Common Association Type IDs:**
- Contact → Deal: 3
- Deal → Contact: 4
- Company → Deal: 6
- Deal → Company: 5
- Contact → Company: 1
- Company → Contact: 2
- Line Item → Deal: 19
- Deal → Line Item: 20

**HTTP Methods:**
- Create: `POST`
- Read: `GET`
- Update: `PATCH`
- Delete: `DELETE`

### Example: Working with the Reference

#### Bad (Wastes Tokens) ❌
```
Read the entire HUBSPOT_API_REFERENCE.md file
```

#### Good (Efficient) ✅
```
User wants to create a deal with associations.
Search for the specific pattern:
grep -A 30 "Pattern 1: Create Deal with Associations" HUBSPOT_API_REFERENCE.md
```

### When to Reference Different Sections

| User Request | Search For |
|--------------|------------|
| Create a deal | `"### Create a Deal"` |
| Associate contact to company | `"### Create an Association"` or `"Contact to Company"` |
| Search for deals by amount | `"### Search Deals"` |
| Get association type IDs | `"### HubSpot Defined Association Type IDs"` |
| Batch create contacts | `"Batch Create" + "Contacts"` |
| Handle rate limits | `"Rate Limits"` or `"Error Handling"` |
| Create line items | `"### Create a Line Item"` |

### Pro Tips

1. **Start with the section heading** - Grep for `"### "` to find specific operations
2. **Use -A flag** - Include 20-50 lines after match to get complete examples
3. **Search for keywords** - `grep -i "association type id"` for case-insensitive
4. **Combine searches** - `grep "Contact" | grep "Association"` to narrow results

### Full Section Names for Grep

- `"## Deals API"`
- `"## Contacts API"`
- `"## Companies API"`
- `"## Line Items API"`
- `"## Associations API"`
- `"## Association Types"`
- `"## Common Patterns"`
- `"## Error Handling"`
- `"## Property Data Types"`
- `"## Pagination"`
- `"## Search Tips"`

---

**Remember:** Only read what you need! The reference is designed to be searched, not read cover-to-cover.
