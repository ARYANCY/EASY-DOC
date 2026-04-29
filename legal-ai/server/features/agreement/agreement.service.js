import fs from 'fs';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
import { v4 as uuidv4 } from 'uuid';
import Agreement from './agreement.model.js';

export const createAgreement = async (name, templateUrl) => {
  const agreementId = uuidv4();
  const agreement = new Agreement({
    agreementId,
    name,
    templateUrl,
    versions: [{ version: 0, text: '', source: 'manual' }],
    currentVersion: 0
  });
  await agreement.save();
  return agreement;
};

export const getAgreement = async (agreementId) => {
  return Agreement.findOne({ agreementId });
};

export const addVersion = async (agreementId, text, source) => {
  const agreement = await Agreement.findOne({ agreementId });
  if (!agreement) throw new Error('Agreement not found');

  const nextVersion = agreement.currentVersion + 1;
  // Truncate future versions if we diverged
  agreement.versions = agreement.versions.slice(0, nextVersion);
  agreement.versions.push({
    version: nextVersion,
    text,
    source
  });
  agreement.currentVersion = nextVersion;
  agreement.status = 'draft';
  await agreement.save();
  return agreement;
};

export const setVersionPointer = async (agreementId, versionIndex) => {
  const agreement = await Agreement.findOne({ agreementId });
  if (!agreement) throw new Error('Agreement not found');
  if (versionIndex < 0 || versionIndex >= agreement.versions.length) {
    throw new Error('Invalid version pointer');
  }
  agreement.currentVersion = versionIndex;
  agreement.status = 'draft'; // undoing or redoing resets approval
  await agreement.save();
  return agreement;
};

export const approveAgreement = async (agreementId) => {
  const agreement = await Agreement.findOne({ agreementId });
  if (!agreement) throw new Error('Agreement not found');
  agreement.status = 'approved';
  await agreement.save();
  return agreement;
};

export const injectPdf = async (agreementId) => {
  const agreement = await Agreement.findOne({ agreementId });
  if (!agreement) throw new Error('Agreement not found');
  if (agreement.status !== 'approved') throw new Error('Must be approved before injection');
  
  if (!agreement.templateUrl || !fs.existsSync(agreement.templateUrl)) {
    throw new Error('Template PDF not found');
  }

  const currentVersionData = agreement.versions[agreement.currentVersion];
  const text = currentVersionData ? currentVersionData.text : '';

  const pdfBytes = fs.readFileSync(agreement.templateUrl);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();
  
  const fields = form.getFields();
  let filled = false;
  if (fields.length > 0) {
    for (const field of fields) {
      if (field.constructor.name === 'PDFTextField') {
        field.setText(text);
        filled = true;
        break; 
      }
    }
  }

  // If we couldn't find a form field, we could do an overlay, but the user explicitly requested AcroForm.
  const outputBytes = await pdfDoc.save();
  const outputFileName = `injected_${agreementId}.pdf`;
  const outputPath = path.join('uploads', outputFileName);
  
  if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads', { recursive: true });
  }

  fs.writeFileSync(outputPath, outputBytes);
  
  agreement.pdfUrl = outputPath;
  agreement.status = 'injected';
  await agreement.save();
  
  return agreement;
};
