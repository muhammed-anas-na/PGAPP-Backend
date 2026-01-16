import Express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import mongoose from "mongoose";
import owner from './models/owner.js';
import Room from './models/Room.js';
import tenant from './models/tenant.js';
import payment from './models/payment.js';

const app = Express();
app.use(cors());
app.use(bodyParser.json());
connectToMongoDB_ATLAS();


app.use((req, res, next) => {
  const start = Date.now();

  console.log(`\n📥 ${req.method} ${req.originalUrl}`);
  console.log('➡️ Body:', req.body);

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`📤 Status: ${res.statusCode} | ⏱️ ${duration}ms`);
  });

  next();
});

app.post('/register', async (req, res) => {
  try {
    const { phone_number, PG_name } = req.body;
    console.log(phone_number, PG_name);
    if (!phone_number || !PG_name) {
      return res.status(400).json({
        error: 'Phone number and PG name are required',
      });
    }

    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phone_number)) {
      return res.status(400).json({
        error: 'Invalid Indian phone number',
      });
    }

    const existingOwner = await owner.findOne({
      phoneNumber: phone_number,
    });

    if (existingOwner) {
      return res.status(409).json({
        error: 'PG owner already exists with this phone number',
      });
    }

    const newOwner = await owner.create({
      phoneNumber: phone_number,
      pgName: PG_name,
    });
    return res.status(201).json({
      message: 'PG owner registered successfully',
      data: {
        id: newOwner._id,
        phone_number: newOwner.phoneNumber,
        pg_name: newOwner.pgName,
      },
    });
  } catch (error) {
    console.error('Register error:', error);

    return res.status(500).json({
      error: 'Internal server error',
    });
  }
});


app.post('/login',(req,res)=>{
    const {phone_number} = req.body;
    owner.findOne({phoneNumber:phone_number}).then((ownerData)=>{
        if(!ownerData){
            return res.status(404).json({error:'PG Owner not found'});
        }
        return res.status(200).json({
            message:'Login successful',
            data:{
                id:ownerData._id,
                phone_number:ownerData.phoneNumber,
                pg_name:ownerData.pgName
            }
        });
    }).catch((error)=>{
        console.error('Login error:',error);
        return res.status(500).json({error:'Internal server error'});
    });

})


app.post('/add-room', async (req, res) => {
  console.log('🧱 /add-room route hit');

  try {
    const { id, room_name, totalBeds } = req.body;

    if (!id || !room_name || !totalBeds) {
      console.log('⚠️ Validation failed');
      return res.status(400).json({ error: 'Missing fields' });
    }

    console.log('➡️ Creating room in DB');

    const beds = Array.from({ length: totalBeds }, (_, i) => ({
      bedNumber: i + 1,
      isOccupied: false,
    }));

    const room = await Room.create({
      pg_owner_id: id,
      room_name,
      totalBeds,
      beds,
    });

    console.log('✅ Room created:', room._id);

    res.status(201).json({ data: room });
  } catch (error) {
    console.error('❌ Error in /add-room');
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.post('/get-rooms',(req,res)=>{
    const {id} = req.body;
    if(!id){
        return res.status(400).json({error:'Owner ID is required'});
    }
    
    Room.find({pg_owner_id:id}).then((rooms)=>{
        console.log("Rooms fetched:",rooms[0].beds);
        return res.status(200).json({
            message:'Rooms fetched successfully',
            data:rooms
        });
    }).catch((error)=>{
        console.error('Get Rooms error:',error);
        return res.status(500).json({error:'Internal server error'});
    });
})


app.post('/add-tenant', async (req, res) => {
  try {
    const {
      pg_owner_id,
      tenantName,
      phoneNumber,
      room,
      bed,
      joiningDate,
      rentPaid,
      depositPaid,
      autoReminder,
      rent,
      deposit
    } = req.body;

    if (!pg_owner_id || !tenantName || !phoneNumber || !room || !bed || !joiningDate) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // 1️⃣ Find room
    const roomDoc = await Room.findOne({
      pg_owner_id,
      room_name: room,
    });

    if (!roomDoc) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // 2️⃣ Find bed
    const bedIndex = roomDoc.beds.findIndex(
      (b) => b.bedNumber === bed
    );

    if (bedIndex === -1) {
      return res.status(400).json({ error: 'Invalid bed number' });
    }

    if (roomDoc.beds[bedIndex].isOccupied) {
      return res.status(400).json({ error: 'Bed already occupied' });
    }

    // 3️⃣ Create tenant
    const tenants = await tenant.create({
      pg_owner_id,
      name: tenantName,
      phone_number: phoneNumber,
      room_id: roomDoc._id,
      room_name: room,
      bed_number: bed,
      joining_date: new Date(joiningDate.split('/').reverse().join('-')),
      rent_paid: rentPaid === 'paid',
      deposit_paid: depositPaid === 'paid',
      auto_reminder: autoReminder,
      rent: rent,
      deposit:deposit,
    });

    // 4️⃣ Update bed occupancy
    roomDoc.beds[bedIndex].isOccupied = true;
    roomDoc.beds[bedIndex].occupantId = tenants._id;

    await roomDoc.save();

    return res.status(201).json({
      message: 'Tenant added successfully',
      data: tenant,
    });
  } catch (error) {
    console.error('Add tenant error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});


app.post('/get-dashboard', async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Owner ID is required' });
    }

    // ---------- ROOMS ----------
    const rooms = await Room.find({ pg_owner_id: id });

    const totalRooms = rooms.length;

    let totalBeds = 0;
    let vacantBeds = 0;

    rooms.forEach(room => {
      totalBeds += room.beds.length;
      vacantBeds += room.beds.filter(b => !b.isOccupied).length;
    });

    // ---------- TENANTS ----------
    const inmates = await tenant.find({ pg_owner_id: id });
   
    const noticePeriod = inmates.filter(i => i.noticePeriod).length;
    const noticePeriodTotal = inmates.length;

    // ---------- RENT (CURRENT MONTH) ----------
const currentMonth = new Date().toISOString().slice(0, 7);

const payments = await payment.find({
  pg_owner_id: id,
  month: currentMonth,
}).populate('tenant_id');
console.log('Payments for current month:', payments);
    let revenue = 0;
    let paid = 0;
    let notPaid = 0;
    let onTime = 0;

const currentMonthDate = new Date();
const dueDate = new Date(
  currentMonthDate.getFullYear(),
  currentMonthDate.getMonth(),
  3,
  23, 59, 59
);

payments.forEach(rent => {
  if (rent.status === 'paid') {
    paid++;
    revenue += rent.rent_amount;

    if (rent.paid_on && rent.paid_on <= dueDate) {
      onTime++;
    }
  } else {
    notPaid++;
  }
});

    // ---------- RESPONSE ----------
    return res.status(200).json({
      stats: {
        totalRooms,
        totalBeds,
        vacantBeds,
        revenue,
        revenueChange: '+0.0%',
        rentDetails: {
          paid,
          notPaid,
          onTime,
        },
        noticePeriod,
        noticePeriodTotal,
      },
    });
  } catch (error) {
    console.error('Dashboard Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});


app.post('/search-tenants', async (req, res) => {
  const { ownerId, query } = req.body;

  if (!ownerId || !query) {
    return res.status(400).json({ error: 'Missing data' });
  }

  const tenants = await tenant.find({
    pg_owner_id:ownerId,
    name: { $regex: query, $options: 'i' }
  }).limit(5);
  console.log("Search results:", tenants);
  res.json({ tenants });
});

app.post('/get-tenant-by-bed', async (req, res) => {
  const { ownerId, roomName, bedNumber } = req.body;

  const tenant = await tenant.findOne({
    ownerId,
    roomName,
    bedNumber
  });

  if (!tenant) {
    return res.json({ tenant: null });
  }

  res.json({ tenant });
});

app.post('/record-payment', async (req, res) => {
  const {
    ownerId,
    tenantId,
    amount,
    month,
    year
  } = req.body;

  await payment.create({
    pg_owner_id:ownerId,
    tenant_id:tenantId,
    rent_amount:amount,
    month,
    year,
    paid_on: new Date()
  });

  res.json({ success: true });
});

app.post('/get-payments', async (req, res) => {
  const { ownerId, month } = req.body;

  const payments = await payment.find({
    pg_owner_id:ownerId,
    month,
  }).populate('tenant_id');
  console.log(payments)
  res.json({ payments });
});






function connectToMongoDB_ATLAS(){
    mongoose.connect('mongodb+srv://resto:1234@cluster0.g3xacoe.mongodb.net/PGAPP-db')
      .then(() => console.log('MongoDB connected to Atlas DB'))
      .catch((err) => console.error('MongoDB connection error:', err));
}


app.listen(3000, () => {
    console.log("Server is running on port 3000");
});