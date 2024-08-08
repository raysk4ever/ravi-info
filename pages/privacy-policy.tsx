
import { useSearchParams } from 'next/navigation'

const PP = () => {
  const searchParams = useSearchParams()
 
  const pp = searchParams.get('pp')
  if (pp === 'quick-dial') {
    return (
      <>
      <h1>Privacy Policy for Quick Dial</h1>
      <p><strong>Effective Date:</strong> July 4, 2024</p>
  
      <h2>1. Introduction</h2>
      <p>Welcome to Quick Dial (&quot;we,&quot; &quot;our,&quot; &quot;us&quot;). We respect your privacy and are committed to protecting any personal information you may provide through our application (&quot;App&quot;). This Privacy Policy outlines our practices regarding the collection, use, and disclosure of your information when you use our App.</p>
  
      <h2>2. Information We Collect</h2>
      <h3>Personal Data:</h3>
      <p><strong>Local Storage Only:</strong> The Quick Dial app allows you to save your favorite contacts on your device. This information is stored locally on your device and is not collected or transmitted to us or any third parties.</p>
  
      <h3>Non-Personal Data:</h3>
      <p><strong>No Collection:</strong> The app does not collect any non-personal data.</p>
  
      <h2>3. Use of Your Information</h2>
      <p><strong>Purpose:</strong> The information you save in Quick Dial, such as your favorite contacts, is used solely to help you access these contacts more quickly and efficiently. Since all data is stored locally, it remains on your device and is not used for any other purpose.</p>
  
      <h2>4. Data Storage and Security</h2>
      <p><strong>Local Storage Only:</strong> All data related to your favorite contacts is stored locally on your device. We do not transmit, collect, or store this data on our servers or any third-party servers.</p>
      <p><strong>Security Measures:</strong> Since there is no data transmission to us or third parties, specific data security measures are not necessary. The app operates entirely on your device, and your saved contacts are secure as per the security protocols of your device&quot;s operating system.</p>
  
      <h2>5. Children&apos;s Privacy</h2>
      <p><strong>No Collection from Children:</strong> Our app does not knowingly collect any personal information from children under the age of 13. If we become aware that a child under 13 has provided us with personal information, we will take immediate steps to delete such information.</p>
  
      <h2>6. Changes to This Privacy Policy</h2>
      <p><strong>Policy Updates:</strong> We may update our Privacy Policy from time to time.</p>
      <p><strong>Notification of Changes:</strong> We will notify you of any changes by posting the updated Privacy Policy on this page.</p>
      <p><strong>Reviewing the Policy:</strong> You are encouraged to review this Privacy Policy periodically for any updates or changes.</p>
      </>
    )
  }

  return ( 
    <>
    <h1>Privacy Policy for Emergency Call INDIA</h1>
    <p><strong>Effective Date:</strong> July 4, 2024</p>

    <h2>1. Introduction</h2>
    <p>Welcome to Emergency Call INDIA (&quot;we,&quot; &quot;our,&quot; &quot;us&quot;). We respect your privacy and are committed to protecting any personal information you may provide through our application (&quot;App&quot;). This Privacy Policy outlines our practices regarding the collection, use, and disclosure of your information when you use our App.</p>

    <h2>2. Information We Collect</h2>
    <h3>Personal Data:</h3>
    <p><strong>No Collection:</strong> We do not collect any personal data through the Emergency Call INDIA app.</p>

    <h3>Non-Personal Data:</h3>
    <p><strong>No Collection:</strong> The app does not collect any non-personal data.</p>

    <h2>3. Use of Your Information</h2>
    <p><strong>No Use:</strong> Since we do not collect any personal or non-personal data, there is no information to use for any purpose.</p>

    <h2>4. Data Security</h2>
    <p><strong>No Data Collected:</strong> We do not collect, store, or process any user data.</p>
    <p><strong>Security Measures:</strong> As there is no data transmission to us or third parties, specific data security measures are not necessary. The app operates entirely on your device.</p>

    <h2>5. Children&apos;s Privacy</h2>
    <p><strong>No Collection from Children:</strong> Our app does not knowingly collect any personal information from children under the age of 13.</p>
    <p><strong>Actions Upon Awareness:</strong> If we become aware that a child under 13 has provided us with personal information, we will take immediate steps to delete such information.</p>

    <h2>6. Changes to This Privacy Policy</h2>
    <p><strong>Policy Updates:</strong> We may update our Privacy Policy from time to time.</p>
    <p><strong>Notification of Changes:</strong> We will notify you of any changes by posting the updated Privacy Policy on this page.</p>
    <p><strong>Reviewing the Policy:</strong> You are encouraged to review this Privacy Policy periodically for any updates or changes.</p>
    </>
  );
}
 
export default PP;