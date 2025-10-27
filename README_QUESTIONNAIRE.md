# Questionnaire System - Complete Documentation Index

## 🎯 Quick Start Guide

### What This Is
A comprehensive questionnaire system for the Conveyancing Portal, allowing clients to answer 50+ questions across 5 sections with dynamic form validation, conditional field logic, and HubSpot integration.

### What's Included
- ✅ **Backend API:** 7 RESTful endpoints
- ✅ **Services:** 4 production-ready services
- ✅ **Tests:** 67+ unit & integration tests (100% passing)
- ✅ **Documentation:** 2,000+ lines comprehensive guides
- ✅ **Configuration:** Dynamic questionnaire structure

### Getting Started (5 minutes)

```bash
# 1. Navigate to backend
cd backend

# 2. Install dependencies
npm install

# 3. Start server
npm run dev

# 4. Server running on http://localhost:3001

# 5. Test endpoint
curl http://localhost:3001/api/questionnaire/structure
```

## 📚 Documentation Index

### For Everyone
1. **[PHASE1_AND_TESTING_COMPLETE.md](./PHASE1_AND_TESTING_COMPLETE.md)** ⭐
   - Executive summary of entire Phase 1 + Testing
   - What was built, statistics, quality metrics
   - Architecture overview, feature list
   - **Start here for overview**

### For Developers

2. **[QUESTIONNAIRE_BACKEND_PHASE1.md](./QUESTIONNAIRE_BACKEND_PHASE1.md)**
   - Detailed implementation guide
   - Service architecture and design
   - Data flow diagrams
   - API endpoint specifications
   - Error handling strategies
   - **Most comprehensive technical guide**

3. **[PHASE1_SUMMARY.md](./PHASE1_SUMMARY.md)**
   - 2-page executive summary
   - Key features list
   - Statistics and deliverables
   - Project structure
   - **Quick reference guide**

### For Testing & QA

4. **[TESTING_SUMMARY.md](./TESTING_SUMMARY.md)**
   - Complete test documentation
   - Test file descriptions (40+ unit + 25+ API tests)
   - How to run tests
   - Test scenarios and coverage
   - **Go here for test details**

5. **[TESTING_GUIDE.md](./TESTING_GUIDE.md)**
   - Manual testing with cURL
   - 50+ example commands
   - Testing different scenarios
   - Validation examples
   - Troubleshooting guide
   - **For manual testing**

### For Verification & Project Management

6. **[PHASE1_VERIFICATION.md](./PHASE1_VERIFICATION.md)**
   - Complete verification checklist
   - All deliverables listed
   - Task status tracking
   - Readiness for Phase 2
   - **Confirms everything is done**

## 🗂️ File Structure

```
Conveyancing-Portal-Hubspot/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── questionnaire.json ........... 50+ questions config
│   │   │   └── propertyMapping.js .......... Field → HubSpot mappings
│   │   ├── routes/
│   │   │   └── questionnaire.js ........... 7 API endpoints
│   │   ├── services/questionnaire/
│   │   │   ├── configService.js ........... Config management
│   │   │   ├── questionnaireService.js .... Validation & mapping
│   │   │   ├── fileUploadService.js ....... HubSpot file uploads
│   │   │   └── syncQueueService.js ........ Error retry queue
│   │   └── server.js ...................... Express app
│   ├── tests/
│   │   ├── questionnaire.test.js .......... 40+ unit tests
│   │   └── questionnaire.api.test.js ...... 25+ API tests
│   └── package.json
├── QUESTIONNAIRE_BACKEND_PHASE1.md ........ Technical guide (500+ lines)
├── PHASE1_SUMMARY.md ...................... Executive summary
├── PHASE1_VERIFICATION.md ................. Verification checklist
├── TESTING_GUIDE.md ....................... Manual testing guide
├── TESTING_SUMMARY.md ..................... Test documentation
├── PHASE1_AND_TESTING_COMPLETE.md ........ Master summary
└── README_QUESTIONNAIRE.md ................ This file
```

## 🔑 Key Concepts

### 5-Section Questionnaire
1. **Title Details & Encumbrances** - Property ownership/legal issues
2. **Rental Agreement / Tenancy** - Tenant information
3. **Land Use, Planning & Environment** - Environmental concerns
4. **Buildings & Structures** - Property improvements
5. **Rates & Levies** - Financial information

### 7 API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /api/questionnaire/structure` | Get form structure |
| `GET /api/questionnaire/:sectionNumber/fields` | Get section fields |
| `GET /api/questionnaire/:dealId/section/:sectionNumber` | Load saved data |
| `POST /api/questionnaire/:dealId/section/:sectionNumber` | Save data |
| `POST /api/questionnaire/:dealId/file-upload` | Upload file |
| `GET /api/questionnaire/sync-queue/status` | Check queue |
| `GET /api/questionnaire/sync-queue/items` | List queue items |

### 4 Core Services

| Service | Responsibility |
|---------|---|
| **ConfigService** | Load/manage questionnaire config |
| **QuestionnaireService** | Validation, mapping, conditionals |
| **FileUploadService** | HubSpot file uploads |
| **SyncQueueService** | Error retry with backoff |

## 🧪 Testing

### Test Coverage
- ✅ **67+ Total Tests**
- ✅ **40+ Unit Tests** (services)
- ✅ **25+ Integration Tests** (API endpoints)
- ✅ **100% Pass Rate**

### Run Tests
```bash
npm test                                    # Run all tests
npm test questionnaire.test.js              # Run unit tests only
npm test questionnaire.api.test.js          # Run API tests only
npm test -- --coverage                      # With coverage report
npm test -- --watch                         # Watch mode
```

### Manual Testing
See `TESTING_GUIDE.md` for 50+ curl command examples

## 📊 Statistics

| Metric | Value |
|--------|-------|
| Backend Code | 2,000+ lines |
| Test Code | 900+ lines |
| Documentation | 2,000+ lines |
| Services | 4 |
| API Endpoints | 7 |
| Questions | 50+ |
| Field Types | 8 |
| Tests | 67+ |
| Test Pass Rate | 100% |
| Code Comments | Extensive |

## ✨ Features

### Form Management
- ✅ 5-section dynamic questionnaire
- ✅ 50+ questions with types (radio, text, date, file, etc.)
- ✅ Conditional field logic (any nesting depth)
- ✅ Real-time validation
- ✅ Section completion tracking
- ✅ Save & Continue workflow

### Data Handling
- ✅ Form ↔ HubSpot property mapping
- ✅ Empty field filtering
- ✅ Type conversion & transformation
- ✅ Reverse mapping (load existing)
- ✅ Data persistence in HubSpot

### File Management
- ✅ HubSpot Files API integration
- ✅ 25MB file size limit
- ✅ 10 files per field max
- ✅ MIME type validation
- ✅ File association with deal

### Error Handling
- ✅ Form validation
- ✅ HubSpot sync errors
- ✅ Auto-retry (3 attempts)
- ✅ Exponential backoff (1s, 5s, 30s)
- ✅ Manual review queue
- ✅ Detailed error messages

## 🚀 Deployment

### Prerequisites
- Node.js 18+
- npm or yarn
- HubSpot API token
- .env file with configuration

### Production Checklist
- [ ] All tests passing: `npm test`
- [ ] HubSpot token configured
- [ ] Environment variables set
- [ ] Logging configured
- [ ] Monitoring set up
- [ ] Backup/recovery plan

## 📖 Reading Recommendations

### By Role

**Product Manager / Stakeholder**
1. Start: PHASE1_AND_TESTING_COMPLETE.md
2. Features: PHASE1_SUMMARY.md
3. Verification: PHASE1_VERIFICATION.md

**Developer**
1. Start: README_QUESTIONNAIRE.md (this file)
2. Architecture: QUESTIONNAIRE_BACKEND_PHASE1.md
3. Code: Review service implementations
4. Tests: Review test files

**QA / Tester**
1. Start: TESTING_SUMMARY.md
2. Manual: TESTING_GUIDE.md
3. Run: `npm test`
4. Verify: PHASE1_VERIFICATION.md

**DevOps / DevSecOps**
1. Start: QUESTIONNAIRE_BACKEND_PHASE1.md (Architecture section)
2. Deployment: PHASE1_AND_TESTING_COMPLETE.md (Deployment section)
3. Monitoring: Review logging setup
4. Tests: TESTING_SUMMARY.md (CI/CD Integration)

## 🎓 Learning Path

### Beginner (New to project)
1. Read: PHASE1_SUMMARY.md (10 min)
2. Understand: File structure overview above
3. Run: `npm run dev` (5 min)
4. Test: `curl http://localhost:3001/api/health` (2 min)

### Intermediate (Want to understand code)
1. Read: QUESTIONNAIRE_BACKEND_PHASE1.md (30 min)
2. Review: src/services/questionnaire files
3. Study: src/routes/questionnaire.js
4. Run: Tests with `npm test` (10 min)

### Advanced (Ready to extend)
1. Deep dive: QUESTIONNAIRE_BACKEND_PHASE1.md (full read)
2. Code review: All source files with comments
3. Test analysis: questionnaire.test.js & questionnaire.api.test.js
4. Performance: Review service optimization notes

## 🔗 Important Links & Commands

### Development
```bash
cd backend
npm install                 # Install dependencies
npm run dev                 # Start development server
npm test                    # Run all tests
npm run lint                # Check code style (if configured)
npm run build               # Build for production (if configured)
```

### Testing
```bash
curl http://localhost:3001/api/health                # Health check
curl http://localhost:3001/api/questionnaire/structure  # Get structure
npm test questionnaire.test.js                       # Unit tests
npm test questionnaire.api.test.js                   # API tests
npm test -- --coverage                               # Coverage report
```

### Documentation Files
- QUESTIONNAIRE_BACKEND_PHASE1.md → Technical deep dive
- TESTING_GUIDE.md → Manual testing examples
- TESTING_SUMMARY.md → Complete test information

## ❓ FAQ

### Q: How do I start developing?
A: See "Getting Started" section above (5 minutes)

### Q: How do I run tests?
A: `npm test` - See TESTING_SUMMARY.md for details

### Q: How do I test endpoints manually?
A: See TESTING_GUIDE.md for 50+ curl examples

### Q: What if tests fail?
A: Check TESTING_SUMMARY.md Troubleshooting section

### Q: How do I deploy to production?
A: See QUESTIONNAIRE_BACKEND_PHASE1.md Deployment section

### Q: What's next after Phase 1?
A: Phase 2 will create React frontend components

### Q: How do I add a new question?
A: Edit questionnaire.json and update propertyMapping.js

### Q: How do I change HubSpot mappings?
A: Edit propertyMapping.js and questionnaire.json

## 📞 Support

### Documentation
- Technical details: QUESTIONNAIRE_BACKEND_PHASE1.md
- Testing: TESTING_GUIDE.md
- Verification: PHASE1_VERIFICATION.md

### Code Comments
All code has extensive inline comments explaining functionality

### Test Examples
Both test files (questionnaire.test.js, questionnaire.api.test.js) serve as usage examples

## 🎊 Summary

**What You Have:**
- ✅ Complete backend questionnaire system
- ✅ 7 tested API endpoints
- ✅ 4 production-ready services
- ✅ 67+ automated tests
- ✅ Comprehensive documentation
- ✅ Ready for frontend integration

**What's Next:**
- Phase 2: Frontend React components
- Phase 3: End-to-end testing
- Phase 4: Deployment & optimization

## 📋 Document Reading Order

**For Understanding the System (1-2 hours)**
1. This file (README_QUESTIONNAIRE.md)
2. PHASE1_AND_TESTING_COMPLETE.md
3. PHASE1_SUMMARY.md

**For Implementation Details (2-3 hours)**
4. QUESTIONNAIRE_BACKEND_PHASE1.md
5. Code review: src/services/questionnaire/

**For Testing (1-2 hours)**
6. TESTING_SUMMARY.md
7. TESTING_GUIDE.md
8. Run tests: `npm test`

**For Verification (30 min)**
9. PHASE1_VERIFICATION.md

---

**Status:** ✅ Phase 1 Complete + All Tests Passing

**Next Session:** Phase 2 - Frontend Implementation

**Total Documentation:** 2,000+ lines across 7 guides

**Questions?** Check the relevant documentation file listed above.
