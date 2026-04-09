import fs from 'fs';
import { generatePDF } from './export.js';
const invoice = {
  number: 'INV-123',
  companyName: 'AEROMAXRR TEC',
  companyAddress: '#39, Ground Floor, Ramaiah Layout, 2nd Cross, Karnataka, Pincode - 560058.',
  clientName: 'Aerostar Technologies',
  clientAddress: 'Peenya Industrial Area',
  lineItems: [
    { description: '90*X50*X40 R10 D2 DIE', hsnCode: '9988', qty: 10, rate: 1710, amount: 17100 },
    { description: 'AXR-073-SIZE MILLING', hsnCode: '9988', qty: 130, rate: 25, amount: 3250 },
    { description: '104-5000324/235 TOP & BOTTOM-300 SET\nOP-10, PO30', hsnCode: '9988', qty: 300, rate: 282, amount: 84600 }
  ]
};
generatePDF(invoice).then(buf => fs.writeFileSync('test.pdf', buf));
