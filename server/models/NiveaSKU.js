import mongoose from "mongoose";

const niveaSKUSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    skuCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ["Roll-on", "Spray", "Lotion", "Shower Gel", "Body Care", "Other"],
      required: true,
      index: true,
    },
    size: {
      type: String,
      default: "",
    },
    pricePc: { type: Number, default: 0 },
    pricePack: { type: Number, default: 0 },
    priceCarton: { type: Number, default: 0 },
    unitsPerPack: { type: Number, default: 6 },
    unitsPerCarton: { type: Number, default: 12 },
    barcode: { type: String, default: "" },
    /** Product photo (data URL or https URL) for Log Shop cart / lists */
    image: { type: String, default: "" },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("NiveaSKU", niveaSKUSchema);
