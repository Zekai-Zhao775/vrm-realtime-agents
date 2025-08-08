# VRM Assets Directory

This directory contains VRM model files for each scenario.

## Required VRM Files

Place the following VRM files in this directory:

### Default Models (Required)
- `default.vrm` - Fallback VRM used when scenario-specific models are not available
- `haiku-writer.vrm` - For simpleHandoff scenario
- `snowboard-specialist.vrm` - For customerServiceRetail scenario
- `therapist.vrm` - For virtualTherapist scenario
- `customer-service.vrm` - For chatSupervisor scenario

## File Structure
```
public/assets/vrm/
├── README.md (this file)
├── default.vrm
├── haiku-writer.vrm
├── snowboard-specialist.vrm
├── therapist.vrm
└── customer-service.vrm
```

## How to Get VRM Files

1. **VRoid Hub**: Download VRM models from https://hub.vroid.com/
2. **VRoid Studio**: Create your own VRM models
3. **Purchase/Commission**: Get custom VRM models from artists
4. **Free Resources**: Find CC0/Free VRM models online

## Notes

- VRM files should be compatible with VRM 1.0 or VRM 0.x format
- Keep file sizes reasonable (under 50MB recommended)
- Test VRM files with facial expressions and lip sync compatibility
- Each scenario will automatically use its designated VRM file
- Users can drag & drop custom VRM files to override defaults per scenario