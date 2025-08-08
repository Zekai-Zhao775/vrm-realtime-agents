/**
 * Sample VRM Download Links
 * These are reliable VRM files you can download for testing
 */

const SAMPLE_VRM_URLS = {
  // Official VRoid/Pixiv sample VRMs
  basic_sample: 'https://pixiv.github.io/three-vrm/packages/three-vrm/examples/models/AvatarSample_A.vrm',
  constraint_sample: 'https://pixiv.github.io/three-vrm/packages/three-vrm/examples/models/VRM1_Constraint_Twist_Sample.vrm',
  
  // VRoid Hub direct downloads (these change, so verify they work)
  // You can get these from hub.vroid.com by finding free models
};

console.log('📥 Sample VRM Download URLs:');
console.log(JSON.stringify(SAMPLE_VRM_URLS, null, 2));

// Instructions to manually download and place VRM files
console.log(`
🔧 Manual Setup Instructions:

1. Download VRM files from VRoid Hub (hub.vroid.com)
2. Place them in: public/assets/vrm/
3. Rename according to scenario:
   - default.vrm (fallback)
   - haiku-writer.vrm (simpleHandoff)
   - snowboard-specialist.vrm (customerServiceRetail) 
   - therapist.vrm (virtualTherapist)
   - customer-service.vrm (chatSupervisor)

4. Or use the same VRM file for all scenarios (for testing):
   - Download one VRM
   - Copy it 5 times with different names
`);