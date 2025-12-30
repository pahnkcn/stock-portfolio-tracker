# Stock Portfolio Tracker - Mobile App Design

## Overview
แอพสำหรับติดตามการลงทุนหุ้นอเมริกา พร้อมระบบ AI Analysis, Technical Analysis, Realtime Stock Data และ Performance Analytics รองรับการ Import ข้อมูลจาก CSV (Monthly Statement)

## Screen List

### 1. Dashboard (Home)
หน้าหลักแสดงภาพรวม portfolio

### 2. Portfolio
จัดการ portfolio หลายพอร์ต และหุ้นในแต่ละพอร์ต

### 3. Stock Detail
รายละเอียดหุ้นแต่ละตัว พร้อม Technical Analysis

### 4. Trade Journal
บันทึกการเทรดและประวัติ transactions

### 5. Analytics
สถิติการลงทุนและ Performance

### 6. Settings
ตั้งค่าแอพ และ Import/Export ข้อมูล

---

## Screen Details

### 1. Dashboard (Home Tab)
**Primary Content:**
- Total Portfolio Value Card (USD & THB)
- Today's Change ($ และ %)
- Mini Portfolio Performance Chart (7 days)
- Top Movers Section (Gainers/Losers)
- Quick Actions (Add Stock, Import CSV)

**Layout:**
- Header: App logo + Settings icon
- Scrollable content with cards
- Bottom Tab Bar

**Colors:**
- Primary: #0066CC (Blue - Trust/Finance)
- Success: #22C55E (Green - Profit)
- Error: #EF4444 (Red - Loss)
- Background: #FFFFFF (Light) / #151718 (Dark)

### 2. Portfolio Tab
**Primary Content:**
- Portfolio List (Multiple portfolios)
- Each portfolio shows: Name, Total Value, P&L
- Holdings list within each portfolio
- Add Portfolio / Add Stock buttons

**Layout:**
- Segmented control: All / By Portfolio
- FlatList of holdings
- Floating Action Button for adding

### 3. Stock Detail Screen
**Primary Content:**
- Stock Header (Symbol, Price, Change)
- Price Chart (Interactive candlestick)
- Key Stats Card (P/E, 52W High/Low, Volume)
- Technical Indicators Section
- Support/Resistance Levels
- AI Analysis Summary
- News Section

**Layout:**
- Scrollable with sticky header
- Tab sections: Overview / Technical / News

### 4. Trade Journal Tab
**Primary Content:**
- Transaction List (Buy/Sell records)
- Filter by: Date, Symbol, Type
- Each entry shows: Symbol, Type, Qty, Price, P&L
- Add Transaction button

**Layout:**
- Search bar at top
- Filter chips
- FlatList of transactions
- FAB for adding

### 5. Analytics Tab
**Primary Content:**
- Performance Summary Card
- Win Rate, Avg Gain/Loss
- Monthly Returns Chart
- Sector Allocation Pie Chart
- Best/Worst Performers

**Layout:**
- Scrollable dashboard
- Cards with charts

### 6. Settings Screen
**Primary Content:**
- Import CSV Section
- Export Data
- Currency Settings (THB Rate)
- Theme Toggle
- About

---

## Key User Flows

### Flow 1: Import CSV Data
1. User taps "Import CSV" on Dashboard or Settings
2. File picker opens to select CSV
3. App parses CSV (Monthly Statement format)
4. Preview screen shows parsed transactions
5. User confirms import
6. Transactions added to Trade Journal
7. Portfolio updated with holdings

### Flow 2: View Stock Analysis
1. User taps stock in Portfolio
2. Stock Detail screen opens
3. User scrolls to Technical section
4. Views indicators, support/resistance
5. Reads AI analysis summary

### Flow 3: Add Manual Transaction
1. User taps FAB in Trade Journal
2. Form opens: Symbol, Type, Qty, Price, Date
3. User fills and submits
4. Transaction saved
5. Portfolio recalculated

### Flow 4: Check Portfolio Performance
1. User opens Analytics tab
2. Views overall performance metrics
3. Scrolls to see charts
4. Taps on specific metric for details

---

## Color Palette

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| primary | #0066CC | #4DA6FF | Accent, buttons, links |
| background | #FFFFFF | #151718 | Screen background |
| surface | #F5F5F5 | #1E2022 | Cards, elevated surfaces |
| foreground | #11181C | #ECEDEE | Primary text |
| muted | #687076 | #9BA1A6 | Secondary text |
| border | #E5E7EB | #334155 | Dividers, borders |
| success | #22C55E | #4ADE80 | Profit, positive change |
| error | #EF4444 | #F87171 | Loss, negative change |
| warning | #F59E0B | #FBBF24 | Alerts, caution |

---

## CSV Format Support

Based on the provided sample (2025-11.csv):

```
Symbol & Name,Trade Date,Settlement Date,Buy/Sell,Quantity,Traded Price,Gross Amount,Comm/Fee/Tax,VAT,Net Amount
NVDA NVIDIA CORPORATION,25/11/2025,26/11/2025,BUY,0.5,172.12,86.06,-0.09,-0.01,86.16
```

**Parsing Rules:**
- Skip header rows (Monthly Statement, TRADE RECORDS, etc.)
- Parse from row starting with "Symbol & Name"
- Split Symbol & Name by first space
- Date format: DD/MM/YYYY
- Handle fractional shares (0.5, 0.28355, etc.)
- Track commission/fees for cost basis

---

## Data Models

### Portfolio
- id, name, description, createdAt

### Holding
- id, portfolioId, symbol, companyName, shares, avgCost, currentPrice

### Transaction
- id, portfolioId, symbol, companyName, type (BUY/SELL), shares, price, date, settlementDate, commission, vat, netAmount, notes

### StockData (cached)
- symbol, currentPrice, change, changePercent, volume, marketCap, lastUpdated

---

## Technical Considerations

- Local storage with AsyncStorage for offline support
- Optional Finnhub API for real-time data
- CSV parsing with custom parser
- Charts using react-native-svg or similar
- All calculations done locally
- THB/USD rate from free API or manual input
