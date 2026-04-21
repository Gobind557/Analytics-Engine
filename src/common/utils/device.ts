export function isMobileDevice(device: string): boolean {
  const normalizedDevice = device.toLowerCase();
  return ['mobile', 'android', 'iphone', 'ipad', 'tablet'].some((token) => normalizedDevice.includes(token));
}
