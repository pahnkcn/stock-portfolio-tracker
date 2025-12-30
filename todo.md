# TradeMind - TODO

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


## Color Accessibility Fix

- [x] เพิ่ม contrast สำหรับ text colors
- [x] ปรับสี muted text ให้เข้มขึ้น
- [x] ปรับสี badge และ labels ให้ชัดเจนขึ้น
- [x] ทดสอบ readability ทั้ง light และ dark mode


## Symbol Autocomplete Feature

- [x] สร้าง Stock Symbol Search API
- [x] สร้าง Autocomplete Component
- [x] เพิ่ม Autocomplete ในหน้า Add Stock
- [x] แสดง Company Name เมื่อเลือก Symbol


## Settings Screen with API Keys

- [x] สร้างหน้า Settings Screen
- [x] เพิ่ม Tab Settings ใน Tab Bar
- [x] สร้างระบบจัดเก็บ API Keys ใน AsyncStorage
- [x] เพิ่มฟอร์มใส่ API Keys (Alpha Vantage, etc.)
- [x] เพิ่มการตั้งค่าอัตราแลกเปลี่ยน USD/THB
- [x] เพิ่ม Toggle Dark/Light Mode (Show in THB)


## Remove Yahoo Finance as Default

- [x] ปิดการดึงข้อมูลจาก Yahoo Finance โดย default
- [x] ให้แอพทำงานได้โดยไม่ต้องมี API Key
- [x] แสดงข้อความแนะนำให้ใส่ API Key ในหน้า Settings
- [x] Feature อื่นๆ ยังคงทำงานได้ (Add Stock, Import CSV, etc.)


## Bug Fixes

- [x] แก้ไข avgPurchaseRate undefined ในหน้า Analytics

## Yahoo API Key & Manual Refresh

- [x] เพิ่ม Yahoo Finance API Key ในหน้า Settings
- [x] แก้ไขจาก auto-refresh เป็น manual refresh
- [x] เพิ่มปุ่ม Refresh ให้ผู้ใช้กดเอง
- [x] ลบ interval auto-refresh ออก


## Add Transaction Improvements

- [x] Auto-fill price per share จาก API เมื่อมี API Key
- [x] เปลี่ยน Date input เป็น Date Picker
- [x] ทำให้ Exchange Rate แก้ไขได้
- [x] เพิ่ม Success Popup หลัง Add สำเร็จ (เลือก Add ต่อ หรือกลับหน้าหลัก)

## Import CSV Bug Fix

- [x] แก้ไข Import CSV ให้ทำงานได้เมื่อแนบไฟล์


## Backup & Restore Feature

- [x] สร้างฟังก์ชัน Export ข้อมูลทั้งหมดเป็น JSON
- [x] สร้างฟังก์ชัน Import ข้อมูลจาก JSON file
- [x] เพิ่ม UI สำหรับ Backup/Restore ในหน้า Settings
- [x] รองรับ file download บน Web
- [x] รองรับ file picker สำหรับ Restore


## Edit/Delete Transaction Feature

- [x] เพิ่ม deleteTransaction function ใน AppContext
- [x] เพิ่ม updateTransaction function ใน AppContext
- [x] สร้างหน้า Edit Transaction Screen
- [x] เพิ่มปุ่ม Edit ใน Transaction Card
- [ ] เพิ่ม Swipe-to-delete gesture (optional enhancement)
- [x] เพิ่ม Confirmation dialog ก่อนลบ
- [x] อัพเดท Holdings เมื่อแก้ไข/ลบ transaction
- [x] Unit tests สำหรับ edit/delete functionality (23 tests passed)


## Success Popup for Edit/Delete Transaction

- [x] เพิ่ม Success Popup หลัง Update transaction สำเร็จ
- [x] เพิ่ม Success Popup หลัง Delete transaction สำเร็จ
