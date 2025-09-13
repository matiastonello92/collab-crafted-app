#!/bin/bash

# Step 6 Verification Suite Runner
# Executes SQL checks and API tests, then generates report

set -e

echo "🔍 Step 6 Verification Suite"
echo "=========================="
echo ""

# Configuration
QA_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SQL_DIR="$QA_DIR/sql"
HTTP_DIR="$QA_DIR/http"
SCRIPTS_DIR="$QA_DIR/scripts"
DOCS_DIR="$(cd "$QA_DIR/../docs" && pwd)"

# Create output directories
mkdir -p "$HTTP_DIR"
mkdir -p "$SQL_DIR"

echo "📁 Output directories:"
echo "   SQL: $SQL_DIR"
echo "   HTTP: $HTTP_DIR"
echo "   Docs: $DOCS_DIR"
echo ""

# Step 1: SQL Verification
echo "🗄️  Running SQL Verification..."
if command -v psql >/dev/null 2>&1; then
    if [ -n "$DATABASE_URL" ]; then
        echo "   Using DATABASE_URL connection"
        psql "$DATABASE_URL" -f "$SQL_DIR/step6_verification.sql" > "$SQL_DIR/step6_verification.out.txt" 2>&1
        echo "   ✅ SQL verification completed"
    else
        echo "   ⚠️  DATABASE_URL not set, skipping SQL verification"
        echo "SKIP: DATABASE_URL not set" > "$SQL_DIR/step6_verification.out.txt"
    fi
else
    echo "   ⚠️  psql not found, skipping SQL verification"
    echo "SKIP: psql not available" > "$SQL_DIR/step6_verification.out.txt"
fi
echo ""

# Step 2: API Tests
echo "🌐 Running API Tests..."
if command -v node >/dev/null 2>&1; then
    node "$SCRIPTS_DIR/step6_api_tests.js" || echo "   ⚠️  Some API tests failed"
else
    echo "   ⚠️  Node.js not found, skipping API tests"
    mkdir -p "$HTTP_DIR"
    echo '{"error": "Node.js not available"}' > "$HTTP_DIR/step6_api_tests_summary.json"
fi
echo ""

# Step 3: Generate Report
echo "📊 Generating Report..."

# Get current date for report filename
REPORT_DATE=$(date +%Y%m%d)
REPORT_FILE="$DOCS_DIR/step6_verification_$REPORT_DATE.md"

# Generate report
cat > "$REPORT_FILE" << 'EOF'
# Step 6 • Verification Report (SaaS)

**Generated:** TIMESTAMP_PLACEHOLDER • **Environment:** ENVIRONMENT_PLACEHOLDER

## A) Functions Hardening
- [ ] No SECURITY DEFINER without `search_path=public` (query A: RESULT_A)
  - Details: DETAILS_A

## B) RLS Metadata RBAC
- [ ] Admin sees `roles` from own org (COUNT>=1) — RESULT_B1
- [ ] Base user does NOT see `roles` (COUNT=0) — RESULT_B2

## C) Audit Events
- [ ] Table `audit_events` present with policies — RESULT_C1
- [ ] Event `settings.updated` (email_test) written in last 15min — RESULT_C2
- [ ] Event `user.invited` written in last 15min — RESULT_C3

## D) API Smoke
- [ ] POST /api/settings/email-test → 200 + messageId — RESULT_D1
- [ ] POST /api/v1/admin/invitations → 200/201 + email sent — RESULT_D2

## Raw Results

### SQL Verification Output
```
SQL_OUTPUT_PLACEHOLDER
```

### API Test Results
```
API_OUTPUT_PLACEHOLDER
```

## Overall Status
- STATUS_PLACEHOLDER
- Next steps: NEXT_STEPS_PLACEHOLDER
EOF

# Replace placeholders with actual data
sed -i.bak "s/TIMESTAMP_PLACEHOLDER/$(date -u '+%Y-%m-%d %H:%M:%S UTC')/" "$REPORT_FILE"
sed -i.bak "s/ENVIRONMENT_PLACEHOLDER/${ENVIRONMENT:-Development}/" "$REPORT_FILE"

# Insert SQL output if available
if [ -f "$SQL_DIR/step6_verification.out.txt" ]; then
    # Use a temporary file to handle multi-line replacement
    TEMP_SQL=$(mktemp)
    cat "$SQL_DIR/step6_verification.out.txt" > "$TEMP_SQL"
    
    # Replace placeholder (this is a bit complex in bash, but works)
    python3 -c "
import sys
content = open('$REPORT_FILE', 'r').read()
sql_content = open('$TEMP_SQL', 'r').read()
content = content.replace('SQL_OUTPUT_PLACEHOLDER', sql_content)
open('$REPORT_FILE', 'w').write(content)
" 2>/dev/null || {
        # Fallback if python3 not available
        sed -i.bak 's/SQL_OUTPUT_PLACEHOLDER/See qa\/sql\/step6_verification.out.txt/' "$REPORT_FILE"
    }
    rm -f "$TEMP_SQL"
else
    sed -i.bak 's/SQL_OUTPUT_PLACEHOLDER/SQL verification was skipped/' "$REPORT_FILE"
fi

# Insert API output if available
if [ -f "$HTTP_DIR/step6_api_tests.out.txt" ]; then
    API_CONTENT=$(cat "$HTTP_DIR/step6_api_tests.out.txt")
    python3 -c "
import sys
content = open('$REPORT_FILE', 'r').read()
api_content = open('$HTTP_DIR/step6_api_tests.out.txt', 'r').read()
content = content.replace('API_OUTPUT_PLACEHOLDER', api_content)
open('$REPORT_FILE', 'w').write(content)
" 2>/dev/null || {
        # Fallback if python3 not available
        sed -i.bak 's/API_OUTPUT_PLACEHOLDER/See qa\/http\/step6_api_tests.out.txt/' "$REPORT_FILE"
    }
else
    sed -i.bak 's/API_OUTPUT_PLACEHOLDER/API tests were skipped/' "$REPORT_FILE"
fi

# Determine overall status based on available results
OVERALL_STATUS="⚠️ PARTIAL"
if [ -f "$SQL_DIR/step6_verification.out.txt" ] && [ -f "$HTTP_DIR/step6_api_tests_summary.json" ]; then
    # Check if API tests passed
    if grep -q '"overallStatus": "PASS"' "$HTTP_DIR/step6_api_tests_summary.json" 2>/dev/null; then
        OVERALL_STATUS="✅ LIKELY PASS"
    else
        OVERALL_STATUS="❌ LIKELY FAIL"
    fi
fi

sed -i.bak "s/STATUS_PLACEHOLDER/$OVERALL_STATUS/" "$REPORT_FILE"
sed -i.bak "s/NEXT_STEPS_PLACEHOLDER/Review detailed output above and fix any failing checks/" "$REPORT_FILE"

# Clean up backup files
rm -f "$REPORT_FILE.bak"

echo "   ✅ Report generated: $REPORT_FILE"
echo ""

# Summary
echo "🎯 Verification Complete"
echo "======================"
echo ""
echo "📋 Check these files:"
echo "   • Report: $REPORT_FILE"
echo "   • SQL Output: $SQL_DIR/step6_verification.out.txt"
echo "   • API Results: $HTTP_DIR/step6_api_tests*.json"
echo ""
echo "🔗 Next: Review the generated report and address any FAIL results"