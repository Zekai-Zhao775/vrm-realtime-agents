# VRM Files Setup Guide

Since we can't automatically download VRM files, you'll need to manually place them in the correct locations.

## Quick Setup Steps

1. **Download or create VRM files** for each scenario
2. **Place them in** `public/assets/vrm/` with these exact names:
   - `default.vrm` - Fallback model
   - `haiku-writer.vrm` - Simple handoff scenario
   - `snowboard-specialist.vrm` - Customer service retail
   - `therapist.vrm` - Virtual therapist
   - `customer-service.vrm` - Chat supervisor

## Temporary Solution (For Testing)

If you want to test the system without setting up all VRM files:

1. **Find any VRM file** (download from VRoid Hub or use existing)
2. **Copy it multiple times** with different names:
   ```bash
   # From the public/assets/vrm/ directory
   cp your-vrm-file.vrm default.vrm
   cp your-vrm-file.vrm haiku-writer.vrm
   cp your-vrm-file.vrm snowboard-specialist.vrm
   cp your-vrm-file.vrm therapist.vrm
   cp your-vrm-file.vrm customer-service.vrm
   ```

## Recommended VRM Sources

- **VRoid Hub**: https://hub.vroid.com/ (Free models)
- **VRoid Studio**: Create your own models
- **Booth**: https://booth.pm/ (Purchase models)

## Development Console Commands

Once the system is running, you can use these console commands for debugging:

```javascript
// Check VRM status
window.vrmUtils.logStatus();

// Validate all VRM files exist
await window.vrmUtils.validate();

// Reset all custom VRMs to defaults
window.vrmUtils.resetAll();

// Access VRM manager directly
window.vrmUtils.manager.getVRMInfo('simpleHandoff');
```