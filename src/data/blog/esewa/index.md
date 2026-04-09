---
title: "Integrating eSewa Payment Gateway in a Web Application"
date: 2024-11-01
oneLiner: "A step-by-step guide to integrating eSewa payment gateway using Hono and TypeScript"
tags: ["esewa", "payment-gateway", "typescript", "hono"]

---

eSewa is one of the most widely used digital payment platforms in Nepal, making it a must-know tool for developers building e-commerce or payment-based applications. This guide will walk you through integrating eSewa into your web application using the Hono framework and TypeScript.

## Prerequisites

To follow along, you'll need:
- A basic understanding of TypeScript.
- A web framework (we'll use Hono).
- Node.js installed on your system.
- eSewa test credentials.

If you’re new to Hono or need more background on eSewa’s API, consider checking their official [developer documentation](https://developer.esewa.com.np).

## Setting Up the Payment Initiation Route

We'll begin by defining a route to initiate the payment process. Here’s how it looks in TypeScript:

```typescript
app.post('/initiate-payment', async (c) => {
  try {
    const { product_name, amount } = await c.req.json();
    
    // Adding fixed charges for the payment
    const tax_amount = 10;
    const product_delivery_charge = 0;
    const product_service_charge = 0;
    const total_amount = amount + tax_amount + product_delivery_charge + product_service_charge;
    
    // Generating transaction details
    const transaction_uuid = Date.now().toString();
    const product_code = generateProductCode(product_name);

    // Creating a signature to validate the payment
    const signed_field_names = "total_amount,transaction_uuid,product_code";
    const signature = createSignature(
      `total_amount=${total_amount},transaction_uuid=${transaction_uuid},product_code=${product_code}`
    );

    return c.json({
      amount,
      total_amount,
      tax_amount,
      product_delivery_charge,
      product_service_charge,
      transaction_uuid,
      product_code,
      signed_field_names,
      signature
    });
  } catch (error) {
    return c.json({ error: 'Payment initiation failed' }, 500);
  }
});
```

## Utility Functions

These functions help generate signatures and product codes:

```typescript
import * as crypto from 'crypto';

export function createSignature(data: string) {
  const secret = "8gBm/:&EnhH.1/q";  // Example secret key
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(data);
  return hmac.digest('base64');
}

export const generateProductCode = (productName: string) => {
  // Use a test product code as per documentation
  return "EPAYTEST";
};

export const verifySignature = (data: any, signature: string, secretKey = "8gBm/:&EnhH.1/q") => {
  const { signed_field_names = '' } = data;
  const fields = signed_field_names.split(',');
  const values = fields.map((field: string | number) => `${data[field]}`).join(',');
  const generatedSignature = createSignature(values);
  return generatedSignature === signature;
};
```

## HTML Form for Payment

This form collects the payment details:

```html
<div>
  <form id="payment-form">
    <div>
      <label>Product Name</label>
      <input type="text" id="product_name" name="product_name" required>
    </div>
    <div>
      <label>Amount (NPR)</label>
      <input type="number" id="amount" name="amount" required>
    </div>
    <button type="submit">Continue to Payment</button>
  </form>

  <div id="payment-details" style="display:none;">
    <h3>Payment Details</h3>
    <div>Amount: <span id="detail-amount"></span></div>
    <div>Tax Amount: <span id="detail-tax"></span></div>
    <div>Total Amount: <span id="detail-total"></span></div>
    <button id="back-button">Back</button>
    <button id="confirm-payment">Confirm Payment</button>
  </div>
</div>
```

## Client-Side JavaScript

Here's the script to handle form submission and display payment details:

```javascript
let paymentData = null;

function showPaymentDetails() {
  document.getElementById('payment-form').style.display = 'none';
  document.getElementById('payment-details').style.display = 'block';
}

function showInitialForm() {
  document.getElementById('payment-form').style.display = 'block';
  document.getElementById('payment-details').style.display = 'none';
}

function updatePaymentDetails(data) {
  document.getElementById('detail-amount').textContent = data.amount;
  document.getElementById('detail-tax').textContent = data.tax_amount;
  document.getElementById('detail-total').textContent = data.total_amount;
}

function submitToEsewa() {
  const esewaForm = document.createElement('form');
  esewaForm.method = 'POST';
  esewaForm.action = 'https://rc-epay.esewa.com.np/api/epay/main/v2/form';

  const formFields = {
    ...paymentData,
    success_url: 'http://localhost:3000/success',
    failure_url: 'http://localhost:3000/failure'
  };

  Object.entries(formFields).forEach(([key, value]) => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = key;
    input.value = value;
    esewaForm.appendChild(input);
  });

  document.body.appendChild(esewaForm);
  esewaForm.submit();
}

document.getElementById('payment-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = {
    product_name: document.getElementById('product_name').value,
    amount: Number(document.getElementById('amount').value)
  };

  try {
    const response = await fetch('/initiate-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    if (response.ok) {
      paymentData = await response.json();
      paymentData.amount = formData.amount;
      updatePaymentDetails(paymentData);
      showPaymentDetails();
    } else {
      throw new Error('Failed to initiate payment');
    }
  } catch (error) {
    console.error('Payment initiation failed:', error);
    alert('Failed to initiate payment. Please try again.');
  }
});

document.getElementById('back-button').addEventListener('click', showInitialForm);
document.getElementById('confirm-payment').addEventListener('click', () => {
  if (paymentData) {
    submitToEsewa();
  }
});
```

## Success and Failure Routes

These routes handle payment success and failure:

```typescript
app.get('/success', async (c) => {
  try {
    const responseData = c.req.query('data');
    if (!responseData) return c.redirect('/failure');

    const decodedData = JSON.parse(Buffer.from(responseData, 'base64').toString('utf-8'));
    const message = decodedData.signed_field_names
      .split(',')
      .map((field: string) => `${field}=${decodedData[field] || ""}`)
      .join(',');

    const signature = createSignature(message);
    if (signature !== decodedData.signature) {
      return c.redirect('/failure?message=Signature mismatch');
    }
    
    return c.html(renderHTML(SuccessPage(decodedData)));
  } catch (error) {
    return c.redirect('/failure?message=Error processing payment response');
  }
});

app.get('/failure', async (c) => {
  const message = c.req.query('message') || 'Payment failed';
  const data = { status: 'FAILED', message, transaction_uuid: c.req.query('transaction_uuid') || 'N/A' };
  return c.html(renderHTML(FailurePage(data)));
});
```

## Conclusion

Integrating eSewa involves setting up routes for payment initiation, creating signatures for validation, managing client-side flows, and handling payment responses. This simplified version is suitable for getting started, but always refer to the [eSewa Developer Documentation](https://developer.esewa.com.np) for the latest updates and security best practices.

## Test Credentials

For testing, use these eSewa credentials:
- **eSewa ID**: 9806800001/2/3/4/5
- **Password**: Nepal@123
- **MPIN**: 1122
- **Token**: 123456