import app from '../src/index.js';
import { withSeededStorage, getAdminCookie, getStaffCookie } from './helpers.js';

process.env.NODE_ENV = 'test';

async function runTests() {
  await withSeededStorage(async () => {
    try {
      console.log("\n--- Running Chat Feature Tests ---");

      console.log("Logging in admin...");
      const adminCookie = await getAdminCookie(app);
      const resMeAdmin = await app.request('/api/auth/me', {
        headers: { 'Cookie': adminCookie }
      });
      if (resMeAdmin.status !== 200) throw new Error("Admin login failed");
      const adminData = await resMeAdmin.json();

      console.log("Logging in staff...");
      const staffCookie = await getStaffCookie(app);
      const resMeStaff = await app.request('/api/auth/me', {
        headers: { 'Cookie': staffCookie }
      });
      if (resMeStaff.status !== 200) throw new Error("Staff login failed");
      const staffData = await resMeStaff.json();

      console.log(`Admin ID: ${adminData.id}, Staff ID: ${staffData.id}`);

    // 3. Admin: Check contacts initially (should be empty)
    console.log("Checking initial contacts...");
    const resContactsEmpty = await app.request('/api/chat/contacts', {
      headers: { 'Cookie': adminCookie }
    });
    if (resContactsEmpty.status !== 200) throw new Error("Failed to get initial contacts");
    const initialContacts = await resContactsEmpty.json();
    if (initialContacts.length !== 0) throw new Error("Expected 0 contacts initially");

    // 4. Admin sends message to Staff
    console.log("Admin sending message to Staff...");
    const resSendMsg = await app.request('/api/chat/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': adminCookie },
      body: JSON.stringify({
        receiver_id: staffData.id,
        message: "Hello Staff! Check product #1."
      })
    });
    if (resSendMsg.status !== 201) throw new Error("Failed to send message");
    const sentMsg = await resSendMsg.json();
    console.log("Sent message details:", sentMsg);
    if (sentMsg.message !== "Hello Staff! Check product #1.") throw new Error("Message content mismatch");

    // 5. Admin sends message to Staff with product tagged (product ID 1)
    console.log("Admin sending message to Staff with product tag...");
    const resSendMsgProduct = await app.request('/api/chat/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': adminCookie },
      body: JSON.stringify({
        receiver_id: staffData.id,
        message: "Check this out",
        product_id: 1
      })
    });
    if (resSendMsgProduct.status !== 201) throw new Error("Failed to send message with product tag");
    const sentMsgProd = await resSendMsgProduct.json();
    if (sentMsgProd.product_id !== 1) throw new Error("Product ID not saved");

    // 6. Staff: Get chat messages from Admin
    console.log("Staff retrieving messages from Admin...");
    const resGetMsgs = await app.request(`/api/chat/messages?other_user_id=${adminData.id}`, {
      headers: { 'Cookie': staffCookie }
    });
    if (resGetMsgs.status !== 200) throw new Error("Failed to get messages");
    const msgs = await resGetMsgs.json();
    console.log("Retrieved messages count:", msgs.length);
    if (msgs.length !== 2) throw new Error("Expected 2 messages");
    if (msgs[0].message !== "Hello Staff! Check product #1.") throw new Error("First message content mismatch");
    console.log("Message with product tag:", msgs[1]);
    if (msgs[1].product_name === null) throw new Error("Expected product name to be populated in join");

    // 7. Staff: Get contacts
    console.log("Staff retrieving contacts...");
    const resContacts = await app.request('/api/chat/contacts', {
      headers: { 'Cookie': staffCookie }
    });
    if (resContacts.status !== 200) throw new Error("Failed to get contacts");
    const contacts = await resContacts.json();
    console.log("Staff contacts list:", contacts);
    if (contacts.length !== 1) throw new Error("Expected 1 contact");
    if (contacts[0].username !== "admin") throw new Error("Expected contact to be 'admin'");
    if (contacts[0].unread_count !== 2) throw new Error("Expected 2 unread messages");

    // 8. Staff: Mark messages as read
    console.log("Staff marking messages from Admin as read...");
    const resMarkRead = await app.request('/api/chat/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': staffCookie },
      body: JSON.stringify({ sender_id: adminData.id })
    });
    if (resMarkRead.status !== 200) throw new Error("Failed to mark messages as read");

    // 9. Staff: Get contacts again (unread count should be 0)
    const resContacts2 = await app.request('/api/chat/contacts', {
      headers: { 'Cookie': staffCookie }
    });
    const contacts2 = await resContacts2.json();
    console.log("Staff contacts list after mark read:", contacts2);
    if (contacts2[0].unread_count !== 0) throw new Error("Expected 0 unread messages after mark read");

    // 10. Test validation checks (negative paths)
    console.log("Testing validation: sending message to non-existent receiver...");
    const resSendInvalidReceiver = await app.request('/api/chat/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': adminCookie },
      body: JSON.stringify({
        receiver_id: 9999,
        message: "Hello non-existent"
      })
    });
    if (resSendInvalidReceiver.status !== 404) {
      throw new Error(`Expected 404 for non-existent receiver, got ${resSendInvalidReceiver.status}`);
    }

    console.log("Testing validation: sending message with non-existent product ID...");
    const resSendInvalidProduct = await app.request('/api/chat/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': adminCookie },
      body: JSON.stringify({
        receiver_id: staffData.id,
        message: "Hello with bad product",
        product_id: 9999
      })
    });
    if (resSendInvalidProduct.status !== 404) {
      throw new Error(`Expected 404 for non-existent product, got ${resSendInvalidProduct.status}`);
    }

    console.log("Testing validation: marking read with invalid sender ID...");
    const resMarkInvalidSender = await app.request('/api/chat/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': staffCookie },
      body: JSON.stringify({ sender_id: 'invalid-id' })
    });
    if (resMarkInvalidSender.status !== 400) {
      throw new Error(`Expected 400 for invalid sender ID format, got ${resMarkInvalidSender.status}`);
    }

      console.log("✅ Chat feature unit tests completed successfully!");
      process.exit(0);
    } catch (error) {
      console.error("❌ Chat unit tests failed:", error);
      process.exit(1);
    }
  });
}

runTests();
