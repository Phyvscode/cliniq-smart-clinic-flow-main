/* eslint-disable @typescript-eslint/no-explicit-any */
import { Response } from "express";
import Prescription from "../models/Prescription";
import Patient from "../models/Patient";
import Queue from "../models/Queue";
import Medicine from "../models/Medicine";
import { AuthRequest } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";

const todayStr = (): string => new Date().toISOString().split("T")[0];

// ── GET /api/pharmacy/queue ───────────────────────────────────────────────────
// Returns prescriptions with medicines created in the last 24 hours
export const getPharmacyQueue = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const prescriptions = await Prescription.find({
    createdAt:           { $gte: cutoff },
    "medicines.0":       { $exists: true },    // has at least one medicine
    collectedByPharmacy: false,
  })
    .populate("patient", "name phone age gender permanentCode")
    .populate("doctor",  "name")
    .populate("medicines.medicine", "name")
    .sort({ createdAt: -1 })
    .lean();

  res.json({ prescriptions });
});

// ── GET /api/pharmacy/lookup/:code ───────────────────────────────────────────
// Lookup a patient by their permanent 6-digit code — returns all their prescriptions
export const lookupByPatientCode = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { code } = req.params;

  const patient = await Patient.findOne({ permanentCode: code }).lean();
  if (!patient) {
    res.status(404).json({ message: "No patient found with this code" });
    return;
  }

  const prescriptions = await Prescription.find({
    patient:        patient._id,
    "medicines.0":  { $exists: true },
  })
    .populate("doctor",            "name")
    .populate("medicines.medicine","name")
    .sort({ createdAt: -1 })
    .lean();

  res.json({
    patient:      patient,
    prescriptions: prescriptions.map((rx: any) => ({
      ...rx,
      collectedByPharmacy: rx.collectedByPharmacy ?? false,
      collectedAt:         rx.collectedAt ?? null,
    })),
  });
});

// ── GET /api/pharmacy/lookup/rx/:rxCode ──────────────────────────────────────
// Lookup by prescription Rx code
export const lookupByRxCode = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { rxCode } = req.params;

  const rx = await Prescription.findOne({ rxCode })
    .populate("patient", "name phone age gender permanentCode")
    .populate("doctor",  "name")
    .populate("medicines.medicine", "name")
    .lean();

  if (!rx) {
    res.status(404).json({ message: "No prescription found with this Rx code" });
    return;
  }

  res.json({ prescription: rx });
});

// ── POST /api/pharmacy/collect/:prescriptionId ───────────────────────────────
// Mark a prescription as collected, record payment method
export const collectPrescription = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { prescriptionId } = req.params;
  const { paymentMethod }  = req.body;

  const rx = await Prescription.findByIdAndUpdate(
    prescriptionId,
    {
      collectedByPharmacy: true,
      collectedAt:         new Date(),
      collectedBy:         req.user?._id,
      paymentMethod:       paymentMethod || "cash",
    },
    { new: true }
  )
    .populate("patient", "name phone permanentCode")
    .populate("medicines.medicine", "name");

  if (!rx) {
    res.status(404).json({ message: "Prescription not found" });
    return;
  }

  res.json({ prescription: rx, message: "Medicines dispensed successfully" });
});

// ── GET /api/pharmacy/medicines ──────────────────────────────────────────────
export const getMedicines = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const medicines = await Medicine.find().sort({ name: 1 });
  res.json({ medicines });
});

// ── POST /api/pharmacy/medicines ─────────────────────────────────────────────
export const addMedicine = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, category, description, manufacturer, stock, unit, price } = req.body;
  if (!name) { res.status(400).json({ message: "Medicine name is required" }); return; }

  const existing = await Medicine.findOne({ name: { $regex: new RegExp(`^${name}$`, "i") } });
  if (existing) { res.status(409).json({ message: "Medicine already exists" }); return; }

  const medicine = await Medicine.create({ name, category, description, manufacturer, stock, unit, price });
  res.status(201).json({ medicine });
});

// ── DELETE /api/pharmacy/medicines/:id ───────────────────────────────────────
export const deleteMedicine = asyncHandler(async (req: AuthRequest, res: Response) => {
  await Medicine.findByIdAndDelete(req.params.id);
  res.json({ message: "Medicine deleted" });
});

// ── OTC Sale ──────────────────────────────────────────────────────────────────

const buildBillText = (sale: any): string => {
  const line = "─".repeat(36);
  const items = sale.items.map((it: any) =>
    `  ${it.medicineName.padEnd(22)} x${it.quantity}  ₹${it.total}`
  ).join("\n");

  return [
    "🧾 *ClinIQ Pharmacy*",
    `Bill No: ${sale.billNumber}`,
    `Date: ${new Date(sale.createdAt).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" })}`,
    sale.customerName ? `Patient: ${sale.customerName}` : "",
    line,
    items,
    line,
    sale.discount > 0 ? `Discount: -₹${sale.discount}` : "",
    `*Total: ₹${sale.grandTotal}*`,
    `Payment: ${sale.paymentMethod.toUpperCase()}`,
    line,
    "_Thank you for choosing ClinIQ Pharmacy_",
  ].filter(Boolean).join("\n");
};

// POST /api/pharmacy/otc
export const createOtcSale = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { customerName, customerPhone, items, discount, paymentMethod } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ message: "At least one medicine item is required" });
    return;
  }

  const OtcSale = (await import("../models/OtcSale")).default;
  const today   = new Date().toISOString().split("T")[0];

  // Generate bill number: OTC-YYYYMMDD-NNN
  const count      = await OtcSale.countDocuments({ saleDate: today });
  const billNumber = `OTC-${today.replace(/-/g, "")}-${String(count + 1).padStart(3, "0")}`;

  const subtotal   = (items as any[]).reduce((s: number, it: any) => s + (it.total ?? it.unitPrice * it.quantity), 0);
  const disc       = Number(discount) || 0;
  const grandTotal = Math.max(0, subtotal - disc);

  const sale = await OtcSale.create({
    customerName:  customerName?.trim()  || "",
    customerPhone: customerPhone?.trim() || "",
    items:         items.map((it: any) => ({
      medicineId:   it.medicineId   || undefined,
      medicineName: it.medicineName,
      quantity:     Number(it.quantity),
      unitPrice:    Number(it.unitPrice),
      total:        Number(it.quantity) * Number(it.unitPrice),
    })),
    subtotal,
    discount:      disc,
    grandTotal,
    paymentMethod: paymentMethod || "cash",
    soldBy:        req.user?._id,
    billSentVia:   "none",
    saleDate:      today,
    billNumber,
  });

  // Send WhatsApp if phone provided
  let billSentVia: "whatsapp" | "print" | "none" = "none";
  let whatsappError = "";

  if (customerPhone?.trim()) {
    const twilioSid   = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioFrom  = process.env.TWILIO_WHATSAPP_FROM;

    if (twilioSid && twilioToken && twilioFrom) {
      try {
        const twilio = require("twilio");
        const client = twilio(twilioSid, twilioToken);
        let phone    = customerPhone.trim().replace(/\s+/g, "");
        if (!phone.startsWith("+")) phone = `+91${phone}`;

        await client.messages.create({
          body: buildBillText(sale),
          from: twilioFrom,
          to:   `whatsapp:${phone}`,
        });
        billSentVia = "whatsapp";
        await OtcSale.findByIdAndUpdate(sale._id, { billSentVia: "whatsapp" });
      } catch (err: any) {
        whatsappError = err.message;
      }
    } else {
      whatsappError = "Twilio not configured";
    }
  }

  res.status(201).json({
    sale,
    billNumber,
    billSentVia,
    whatsappError: whatsappError || undefined,
    message: billSentVia === "whatsapp"
      ? `Bill sent to ${customerPhone} via WhatsApp`
      : customerPhone
        ? `Sale recorded. WhatsApp failed: ${whatsappError}. Please print the bill.`
        : "Sale recorded. Please print the bill.",
    billText: buildBillText(sale),
  });
});

// GET /api/pharmacy/otc  — today's OTC sales
export const getOtcSales = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const OtcSale = (await import("../models/OtcSale")).default;
  const today   = new Date().toISOString().split("T")[0];
  const sales   = await OtcSale.find({ saleDate: today })
    .populate("soldBy", "name")
    .sort({ createdAt: -1 });
  res.json({ sales });
});