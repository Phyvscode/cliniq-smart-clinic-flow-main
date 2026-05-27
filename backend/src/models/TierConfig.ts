import mongoose, { Document, Schema } from "mongoose";

export interface ITierConfig extends Document {
  tier:      number;
  notes?:    string;
  updatedAt: Date;
}

const TierConfigSchema = new Schema({
  tier:      { type: Number, default: 0, min: 0, max: 3 },
  notes:     { type: String, default: "" },
  updatedAt: { type: Date,   default: Date.now },
});

export default mongoose.model<ITierConfig>("TierConfig", TierConfigSchema);