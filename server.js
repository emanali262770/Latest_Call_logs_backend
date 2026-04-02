import "dotenv/config";
import express from 'express';
import cors from 'cors';

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

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

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
