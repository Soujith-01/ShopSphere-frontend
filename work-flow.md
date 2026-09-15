1. CUSTOMER COMPLETE FLOW
The customer's goal is:

Discover products → purchase → track → review/return.


CUSTOMER
   │
   ▼
Register / Login
   │
   ▼
Customer Home
   │
   ├───────────────┐
   │               │
   ▼               ▼
Browse          AI Search
Products        / Semantic Search
   │               │
   └───────┬───────┘
           ▼
      Product Listing
           │
           ▼
      Product Details
           │
      ┌────┴────┐
      ▼         ▼
 Wishlist    Add to Cart
                │
                ▼
        Multi-Vendor Cart
                │
                ▼
            Checkout
                │
       ┌────────┼────────┐
       ▼        ▼        ▼
    Address   Coupon   Order Summary
       │        │        │
       └────────┼────────┘
                ▼
          Place Order
                │
                ▼
        Inventory Reserve
                │
                ▼
        Order Created
                │
                ▼
       Payment/Confirmation
                │
                ▼
         Order Tracking
                │
                ▼
            Delivered
           /         \
          /           \
         ▼             ▼
      Review          Return
                        │
                        ▼
                     Refund
Customer screens

Public
├── Home
├── Login
├── Register
├── Products
├── Product Details
└── Search

Authenticated
├── Dashboard
├── Wishlist
├── Cart
├── Checkout
├── My Orders
├── Order Details
├── Returns
├── Reviews
├── Notifications
└── Profile
Customer step-by-step
Step 1 — Register/Login

Register
   ↓
CUSTOMER account created
   ↓
Login
   ↓
JWT/session
   ↓
Customer Dashboard
Step 2 — Browse
Customer can:


Categories
Search
Filters
Pagination
Sort
Step 3 — AI search
Customer searches:

comfortable running shoes for long distance


Query
 ↓
Gemini embedding
 ↓
MongoDB Vector Search
 ↓
Semantic results
Step 4 — Product details
Customer views:


Product
Images
Price
Variants
Stock
Description
Selling Points
Reviews
Rating
Seller
A product VIEW event is recorded for recommendations.

Step 5 — Wishlist

Product
 ↓
Add to Wishlist
 ↓
WISHLIST event
Step 6 — Cart
Customer adds products.

Example:


Seller A
 └── Shoes ₹3000

Seller B
 └── Headphones ₹2000
Step 7 — Checkout
Customer provides:


Address
Phone
Coupon
Payment method
Backend validates:


Stock
Price
Coupon
Product availability
Step 8 — Order creation
One customer checkout can result in:


Parent Order #1001
│
├── Seller A Order
│    └── Shoes
│
└── Seller B Order
     └── Headphones
Step 9 — Track order

PLACED
 ↓
CONFIRMED
 ↓
PACKED
 ↓
SHIPPED
 ↓
OUT_FOR_DELIVERY
 ↓
DELIVERED
Step 10 — Review
After delivery:


Delivered
   ↓
Write Review
   ↓
Rating + Comment
   ↓
Review moderation
Step 11 — Return

Delivered
   ↓
Return Request
   ↓
Under Review
   ↓
Approved
   ↓
Pickup
   ↓
Returned
   ↓
Refunded
Step 12 — Recommendations
Customer behavior:


VIEW
CLICK
WISHLIST
ADD_TO_CART
PURCHASE
feeds the recommendation system.


User Behavior
      ↓
Product embeddings
      ↓
Similarity
      ↓
Recommended Products
2. SELLER COMPLETE FLOW
Seller's goal:

Get approved → create store → add products → sell → fulfill orders → manage inventory → receive settlement.


SELLER
   │
   ▼
Register
   │
   ▼
Seller Application
   │
   ▼
PENDING
   │
   ▼
ADMIN APPROVAL
   │
   ▼
APPROVED
   │
   ▼
Seller Dashboard
   │
   ├── Store
   ├── Products
   ├── Inventory
   ├── Orders
   ├── Returns
   └── Analytics
Seller screens

Seller
├── Dashboard
├── Store Profile
├── Products
├── Add Product
├── Edit Product
├── Inventory
├── Orders
├── Returns
├── Analytics
├── Settlements
└── Notifications
Seller step-by-step
Step 1 — Register

Register as SELLER
       ↓
Seller application
       ↓
status = PENDING (approval request sent to admin — login blocked)
Step 2 — Admin approval

ADMIN
 ↓
Review seller
 ↓
APPROVE ──────→ Seller activated (seller can now log in)
 ↓
REJECT (reason sent to seller — login stays blocked;
        admin can approve later)
Step 3 — Create store
Seller configures:


Store Name
Logo
Banner
Description
Contact
Address
Step 4 — Create product

Add Product
 ↓
Name
Brand
Category
Variants
Attributes
Price
Stock
Images
Step 5 — AI content generation
Seller enters structured attributes:


Name
Brand
Category
Material
Color
Features
Target audience
Then:


Generate with AI
       ↓
Gemini
       ↓
Description
Selling Points
Seller reviews the generated content.

Step 6 — Product submission

Create Product
 ↓
PENDING
 ↓
ADMIN MODERATION
Step 7 — Product approved

APPROVED
 ↓
Visible in marketplace
The product embedding is also generated for:


Semantic Search
Recommendations
Step 8 — Inventory
Seller manages:


Available Stock
Reserved Stock
Low Stock
SKU
Variants
Example:


Black / Size 9 → 10
Black / Size 10 → 5
White / Size 9 → 7
Step 9 — Customer orders
Seller receives only their relevant order items.


New Order
 ↓
Confirm
 ↓
Pack
 ↓
Ready for shipment
Step 10 — Shipment
Delivery partner handles the actual delivery progression.


PACKED
 ↓
SHIPPED
 ↓
OUT_FOR_DELIVERY
 ↓
DELIVERED
Step 11 — Returns
Seller can see return requests for their products.


Return Request
 ↓
Review
 ↓
Approve / Reject
 ↓
Pickup
 ↓
Returned
Step 12 — Analytics
Seller sees:


Revenue
Orders
Units Sold
Top Products
Low Stock
Product Views
Conversion
Step 13 — Settlement
After the applicable order/refund conditions:


Gross Sales
    ↓
Platform Commission
    ↓
Fees/adjustments
    ↓
Net Seller Settlement
3. ADMIN COMPLETE FLOW
Admin's goal:

Control and moderate the entire marketplace.


ADMIN
  │
  ▼
Login
  │
  ▼
Admin Dashboard
  │
  ├── Users
  ├── Sellers
  ├── Products
  ├── Categories
  ├── Orders
  ├── Coupons
  ├── Reviews
  ├── Returns
  ├── Disputes
  ├── Settlements
  ├── Reports
  └── Audit Logs
Admin screens

Admin
├── Dashboard
├── Users
├── Sellers
├── Seller Applications
├── Products
├── Product Moderation
├── Categories
├── Orders
├── Coupons
├── Reviews
├── Returns
├── Disputes
├── Settlements
├── Reports
└── Audit Logs
Admin step-by-step
Step 1 — Login

Admin Login
 ↓
JWT
 ↓
ADMIN authorization
 ↓
Admin Dashboard
Step 2 — Seller approval

Seller Application
 ↓
Review seller
 ├── Approve
 └── Reject
Step 3 — Product moderation

New Product
 ↓
PENDING
 ↓
Review
 ├── APPROVE
 └── REJECT
Step 4 — Category management
Admin can:


Create Category
Edit Category
Delete/Deactivate Category
Example:


Electronics
├── Mobiles
├── Laptops
└── Headphones
Step 5 — User management
Admin can:


View Users
Filter Users
Deactivate
Reactivate
Change permitted role/status
Step 6 — Order monitoring
Admin can view:


All Orders
Seller
Customer
Amount
Status
Payment
Shipment
Admin sees the marketplace-level view, unlike sellers.

Step 7 — Coupons
Admin creates:


WELCOME10
10% discount
Min order ₹1000
Max discount ₹500
Expiry date
Usage limit
Step 8 — Review moderation

Review
 ↓
PENDING
 ↓
Admin
 ├── Approve
 └── Reject
Step 9 — Disputes
For serious customer/seller issues:


Customer
   ↓
Support
   ↓
Escalation
   ↓
Admin
   ↓
Final Decision
Step 10 — Settlements
Admin can inspect:


Seller
Gross Sales
Commission
Refunds
Net Settlement
Settlement Status
Step 11 — Reports
Admin dashboard can show:


Total Users
Total Sellers
Total Products
Total Orders
Total Sales
Platform Revenue
Returns
Refunds
Disputes
Step 12 — Audit logs
Every important administrative action can be recorded:


Who
What action
Which record
When
Old value
New value
4. SUPPORT AGENT COMPLETE FLOW
Support's goal:

Resolve customer problems and disputes.


SUPPORT
   │
   ▼
Login
   │
   ▼
Support Dashboard
   │
   ▼
Tickets
   │
   ├── New
   ├── Assigned
   ├── In Progress
   ├── Escalated
   └── Resolved
Flow

Customer creates ticket
        ↓
Support receives ticket
        ↓
Open order/customer details
        ↓
Investigate
        ↓
Contact seller if necessary
        ↓
Resolve
    /       \
   /         \
Resolve     Escalate
              ↓
            Admin
Typical issues:


Wrong product
Damaged product
Missing product
Refund problem
Delivery problem
Seller dispute
5. DELIVERY PARTNER COMPLETE FLOW
Delivery's goal:

Pick up and deliver assigned seller shipments.


DELIVERY PARTNER
       │
       ▼
Login
       │
       ▼
Delivery Dashboard
       │
       ▼
Assigned Shipments
       │
       ▼
Open Shipment
       │
       ▼
Pick Up
       │
       ▼
In Transit
       │
       ▼
Out for Delivery
       │
       ▼
Delivered
Delivery partner should only access shipments assigned to them.

6. HOW ALL ROLES CONNECT
This is the most important overall workflow.


                    SHOPSPHERE
                        │
       ┌────────────────┼────────────────┐
       │                │                │
    CUSTOMER          SELLER           ADMIN
       │                │                │
       │                │                │
       │           Create Product        │
       │                │                │
       │                └──────►─────────┤
       │                           Approve
       │                │                │
       ▼                │                │
  Browse Product ◄──────┘                │
       │                                  │
       ▼                                  │
   Add to Cart                            │
       │                                  │
       ▼                                  │
    Checkout                              │
       │                                  │
       ▼                                  │
     Order ───────────────► Seller        │
       │                     │            │
       │                     ▼            │
       │                  Confirm         │
       │                     │            │
       │                     ▼            │
       │                   Pack           │
       │                     │            │
       │                     ▼            │
       │              Delivery Partner   │
       │                     │            │
       │                     ▼            │
       ◄──────────────── Delivered       │
       │                                  │
       ├── Review ───────────────────────►│
       │                                  │
       └── Return ─────► Support ────────►│
                              │           │
                              └──► Admin  │
                                          │
                                          ▼
                                      Settlement
7. ROLE PERMISSION SUMMARY
Function	Customer	Seller	Admin	Support	Delivery
Browse products	✅	✅	✅	✅	✅
Semantic search	✅	✅	✅	✅	✅
Get recommendations	✅	—	—	—	—
Add cart	✅	—	—	—	—
Checkout	✅	—	—	—	—
Create products	—	✅	✅	—	—
Manage own products	—	✅	—	—	—
Approve products	—	—	✅	—	—
Manage inventory	—	✅	✅	—	—
View own orders	✅	✅	—	—	✅
View all orders	—	—	✅	Limited	Assigned
Manage returns	✅ Request	Own products	✅	✅	—
Reviews	✅	—	✅ Moderate	—	—
Coupons	Use	—	✅ Create	—	—
Settlements	—	View own	✅ Manage	—	—
Support tickets	Create	Limited	✅	✅	—
User management	—	—	✅	—	—
Seller approval	—	—	✅	—	—
Audit logs	—	—	✅	—	—

8. THE BEST FRONTEND NAVIGATION STRUCTURE
When you start your React frontend, your role-based navigation can be:

Customer

Home
Shop
Search
Categories
Wishlist
Cart
Orders
Returns
Notifications
Profile
Seller

Dashboard
Store
Products
Inventory
Orders
Returns
Settlements
Analytics
Notifications
Profile
Admin

Dashboard
Users
Sellers
Products
Categories
Orders
Coupons
Reviews
Returns
Disputes
Settlements
Reports
Audit Logs
Support

Dashboard
Tickets
Orders
Customers
Disputes
Notifications
Delivery

Dashboard
Assigned Deliveries
Shipment Details
Delivery History
Profile
9. THE CORE FLOW YOU SHOULD DEMO
For your capstone presentation, I'd demonstrate this single connected scenario:


ADMIN
 ↓
Approves Seller
 ↓
SELLER
 ↓
Creates Store
 ↓
Creates Product
 ↓
Gemini generates description + selling points
 ↓
Admin approves Product
 ↓
CUSTOMER
 ↓
AI semantic search
 ↓
Views Product
 ↓
Adds to Wishlist/Cart
 ↓
Adds another product from another Seller
 ↓
Multi-vendor Checkout
 ↓
Order Created + Split by Seller
 ↓
SELLERS
 ↓
Confirm + Pack
 ↓
DELIVERY
 ↓
Ship + Deliver
 ↓
CUSTOMER
 ↓
Reviews Product
 ↓
Requests Return
 ↓
SUPPORT
 ↓
Handles Issue
 ↓
ADMIN
 ↓
Settlement/Refund monitoring