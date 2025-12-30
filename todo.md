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
