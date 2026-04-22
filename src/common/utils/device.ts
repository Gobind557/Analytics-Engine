export type DeviceType = 'mobile' | 'desktop';

export function classifyDeviceType(device: string): DeviceType {
  const normalizedDevice = device.toLowerCase();

  return ['mobile', 'android', 'iphone', 'ipad', 'tablet'].some((token) => normalizedDevice.includes(token))
    ? 'mobile'
    : 'desktop';
}
