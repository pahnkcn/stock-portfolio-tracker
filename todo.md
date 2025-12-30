# Stock Portfolio Tracker - TODO

## Core Features

- [x] Dashboard หน้าหลักแสดงภาพรวม portfolio
- [x] Portfolio Management (สร้าง/แก้ไข/ลบ portfolio)
- [x] Holdings Management (เพิ่ม/แก้ไข/ลบหุ้น)
- [x] Stock Detail Screen พร้อม Price Chart
- [x] Technical Indicators Dashboard
- [x] Support & Resistance Levels
- [x] Trade Journal บันทึกการเทรด
- [x] Performance Analytics สถิติการลงทุน
- [x] CSV Import (Monthly Statement format)
- [x] THB/USD Currency Display
- [ ] Settings Screen

## UI Components

- [x] Tab Navigation (Dashboard, Portfolio, Journal, Analytics)
- [x] Portfolio Card Component
- [x] Holding Card Component
- [x] Transaction Card Component
- [ ] Price Chart Component
- [x] Stats Card Component
- [x] Import CSV Modal

## Data Management

- [x] AsyncStorage for local data persistence
- [x] Portfolio data model
- [x] Transaction data model
- [x] CSV Parser for Monthly Statement format
- [x] Calculate average cost (multiple lots)
- [x] Calculate P&L per holding
- [x] Calculate total portfolio value

## Additional Features

- [x] Search stocks
- [x] Filter transactions
- [x] Dark mode support
- [x] App Logo and Branding


## Stock API Integration

- [x] เชื่อมต่อ Stock API สำหรับดึงราคาหุ้น real-time
- [x] สร้าง Stock API Service
- [x] อัพเดท Dashboard ให้แสดงราคา real-time
- [x] อัพเดท Stock Detail ให้แสดงราคา real-time
- [x] เพิ่ม auto-refresh ราคาหุ้น


## Trading Performance Enhancement

- [x] คำนวณ Realized P&L จาก closed positions
- [x] คำนวณ Win Rate จาก completed trades
- [x] คำนวณ Profit Factor (gross profit / gross loss)
- [x] คำนวณ Average Win/Loss per trade
- [x] แสดง Trade History พร้อม P&L แต่ละรายการ
- [x] อัพเดท Analytics Screen ให้แสดงข้อมูลจริง


## THB/USD Currency P&L Analysis

- [x] ดึง realtime USD/THB exchange rate จาก API
- [x] บันทึก exchange rate ณ วันที่ซื้อทุก transaction
- [x] แสดงมูลค่า portfolio ทั้ง USD และ THB
- [x] คำนวณ Stock P&L (กำไร/ขาดทุนจากราคาหุ้น)
- [x] คำนวณ Currency P&L (กำไร/ขาดทุนจากค่าเงิน)
- [x] คำนวณ Total P&L in THB
- [x] แสดง Per-Holding Currency Analysis
- [x] แยก Realized vs Unrealized Currency P&L
- [x] สร้าง Currency Impact Dashboard


## UI/UX Modernization

### Theme & Design System
- [x] อัพเดท color palette ให้ทันสมัย (gradient, vibrant colors)
- [x] เพิ่ม glassmorphism effect สำหรับ cards
- [x] ปรับปรุง typography และ spacing

### Data Visualization
- [x] เพิ่ม Mini Chart สำหรับ Holdings (sparkline)
- [x] เพิ่ม Donut Chart แสดง Portfolio Allocation
- [x] เพิ่ม Progress Bar แสดง P&L
- [x] เพิ่ม Animated Number Counter

### Animations
- [x] เพิ่ม Fade-in animation สำหรับ screens
- [x] เพิ่ม Scale animation สำหรับ cards
- [x] เพิ่ม Stagger animation สำหรับ lists
- [x] เพิ่ม Shimmer loading effect
- [x] เพิ่ม Pull-to-refresh animation

### Component Improvements
- [x] ปรับปรุง Portfolio Card ให้ดูทันสมัย
- [x] ปรับปรุง Holding Card ให้มี mini chart
- [x] ปรับปรุง Stats Cards ให้มี animation
- [x] เพิ่ม Skeleton loading states
