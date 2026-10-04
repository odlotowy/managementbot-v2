import { Schema, model, models } from "mongoose";

export interface IModMailSettings {
  guildId: string;
  enabled: boolean;
}

const ModMailSettingsSchema = new Schema<IModMailSettings>({
  guildId: { type: String, required: true, unique: true },
  enabled: { type: Boolean, default: true },
});

export default models.ModMailSettings ||
  model<IModMailSettings>("ModMailSettings", ModMailSettingsSchema);
