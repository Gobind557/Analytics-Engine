import { classifyDeviceType } from './device';

describe('classifyDeviceType', () => {
  it('classifies mobile user agents with mobile keywords', () => {
    expect(classifyDeviceType('Mobile Safari on iPhone')).toBe('mobile');
    expect(classifyDeviceType('Android Chrome')).toBe('mobile');
  });

  it('defaults unknown devices to desktop', () => {
    expect(classifyDeviceType('Desktop Chrome')).toBe('desktop');
    expect(classifyDeviceType('PlayStation Browser')).toBe('desktop');
  });
});
