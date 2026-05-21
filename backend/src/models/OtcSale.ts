import mongoose, { Document, Schema } from "mongoose";

interface OtcSaleItem {
  medicineId:   mongoose.Types.ObjectId;
  medicineName: string;
  quantity:     number;
  unitPrice:    number;
  total:        number;
}

export interface IOtcSale extends Document {
  customerName?:   string;
  customerPhone?:  string;
  items:           OtcSaleItem[];
  subtotal:        number;
  discount:        number;
  grandTotal:      number;
  paymentMethod:   string;
  soldBy:          mongoose.Types.ObjectId;
  billSentVia:     "whatsapp" | "print" | "none";
  saleDate:        string;    // YYYY-MM-DD
  billNumber:      string;    // e.g. OTC-20260506-001
}

const OtcSaleSchema = new Schema<IOtcSale>(
  {
    customerName:  { type: String, default: "" },
    customerPhone: { type: String, default: "" },
    items: [{
      medicineId:   { type: Schema.Types.ObjectId, ref: "Medicine" },
      medicineName: { type: String, required: true },
      quantity:     { type: Number, required: true, min: 1 },
      unitPrice:    { type: Number, required: true, min: 0 },
      total:        { type: Number, required: true, min: 0 },
    }],
    subtotal:      { type: Number, required: true },
    discount:      { type: Number, default: 0 },
    grandTotal:    { type: Number, required: true },
    paymentMethod: { type: String, default: "cash" },
    soldBy:        { type: Schema.Types.ObjectId, ref: "User", required: true },
    billSentVia:   { type: String, enum: ["whatsapp","print","none"], default: "none" },
    saleDate:      { type: String, required: true },
    billNumber:    { type: String, required: true },
  },
  { timestamps: true },
);

export default mongoose.model<IOtcSale>("OtcSale", OtcSaleSchema);