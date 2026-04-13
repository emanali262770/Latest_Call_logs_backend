import "dotenv/config";
import express from 'express';
import cors from 'cors';
import path from "path";
import { fileURLToPath } from "url";

import { connectDB } from './config/db.js';

// ✅ ROUTES IMPORT
import authRoutes from './routes/auth.routes.js';
import employeeRoutes from './routes/employee.routes.js';
import userRoutes from './routes/user.routes.js';
import groupRoutes from './routes/group.routes.js';
import permissionRoutes from './routes/permission.routes.js';
import accessRoutes from './routes/access.routes.js';
import departmentRoutes from './routes/department.routes.js';
import designationRoutes from './routes/designation.routes.js';
import employeeTypeRoutes from './routes/employeeType.routes.js';
import dutyShiftRoutes from './routes/dutyShift.routes.js';
import bankRoutes from './routes/bank.routes.js';
import companyRoutes from './routes/company.routes.js';
import itemTypeRoutes from './routes/itemType.routes.js';
import categoryRoutes from './routes/category.routes.js';
import subCategoryRoutes from './routes/subCategory.routes.js';
import manufacturerRoutes from './routes/manufacturer.routes.js';
import unitRoutes from './routes/unit.routes.js';
import locationRoutes from './routes/location.routes.js';
import supplierRoutes from './routes/supplier.routes.js';
import customerRoutes from './routes/customer.routes.js';
import itemDefinitionRoutes from './routes/itemDefinition.routes.js';
import openingStockRoutes from './routes/openingStock.routes.js';
import itemReportRoutes from './routes/itemReport.routes.js';
import serviceRoutes from './routes/service.routes.js';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors({
  origin: ["http://192.168.100.13:5173", "http://localhost:5173","http://192.168.0.104:5173"],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  credentials: true,
}));
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get('/', (req, res) => {
 res.status(200).json({ message: 'Welcome to the Call Logs API' });
});

// ✅ ROUTES USE
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/users', userRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/access', accessRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/designations', designationRoutes);
app.use('/api/employee-types', employeeTypeRoutes);
app.use('/api/duty-shifts', dutyShiftRoutes);
app.use('/api/banks', bankRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/item-types', itemTypeRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/sub-categories', subCategoryRoutes);
app.use('/api/manufacturers', manufacturerRoutes);
app.use('/api/units', unitRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/item-definitions', itemDefinitionRoutes);
app.use('/api/opening-stock', openingStockRoutes);
app.use('/api/item-report', itemReportRoutes);
app.use('/api/services', serviceRoutes);

app.use((err, req, res, next) => {
  console.error("Request error:", err);

  const statusCode = err.statusCode || err.status || 500;
  const message =
    err.message ||
    err.error?.message ||
    err.error?.msg ||
    "Internal server error";

  return res.status(statusCode).json({
    success: false,
    message,
    error: process.env.NODE_ENV === "development" ? String(message) : null,
  });
});

async function startServer() {
  try {
    await connectDB();
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
}

startServer();
