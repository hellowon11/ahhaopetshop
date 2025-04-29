import mongoose, { Schema, Document } from 'mongoose';

export interface IShopInformation extends Document {
  name: string;
  logo: string;
  email: string;
  phone: string;
  businessHours: {
    monday: { open: string; close: string; isOpen: boolean };
    tuesday: { open: string; close: string; isOpen: boolean };
    wednesday: { open: string; close: string; isOpen: boolean };
    thursday: { open: string; close: string; isOpen: boolean };
    friday: { open: string; close: string; isOpen: boolean };
    saturday: { open: string; close: string; isOpen: boolean };
    sunday: { open: string; close: string; isOpen: boolean };
  };
  socialMedia: {
    instagram: string;
    facebook: string;
    whatsapp: string;
  };
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
  googleMapsApiKey?: string;
}

const ShopInformationSchema: Schema = new Schema({
  name: { type: String, required: true },
  logo: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  businessHours: {
    monday: {
      open: { type: String, default: '10:00' },
      close: { type: String, default: '22:00' },
      isOpen: { type: Boolean, default: true }
    },
    tuesday: {
      open: { type: String, default: '10:00' },
      close: { type: String, default: '22:00' },
      isOpen: { type: Boolean, default: true }
    },
    wednesday: {
      open: { type: String, default: '10:00' },
      close: { type: String, default: '22:00' },
      isOpen: { type: Boolean, default: true }
    },
    thursday: {
      open: { type: String, default: '10:00' },
      close: { type: String, default: '22:00' },
      isOpen: { type: Boolean, default: true }
    },
    friday: {
      open: { type: String, default: '10:00' },
      close: { type: String, default: '22:00' },
      isOpen: { type: Boolean, default: true }
    },
    saturday: {
      open: { type: String, default: '10:00' },
      close: { type: String, default: '22:00' },
      isOpen: { type: Boolean, default: true }
    },
    sunday: {
      open: { type: String, default: '10:00' },
      close: { type: String, default: '22:00' },
      isOpen: { type: Boolean, default: true }
    }
  },
  socialMedia: {
    instagram: String,
    facebook: String,
    whatsapp: String
  },
  address: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, required: true },
    coordinates: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true }
    }
  },
  googleMapsApiKey: { type: String, required: false }
});

export const ShopInformation = mongoose.model<IShopInformation>('ShopInformation', ShopInformationSchema); 