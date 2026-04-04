const ProductCost = require('../models/ProductCost');
const { uploadToCloudinary, deleteFromCloudinary } = require('../middleware/uploadMiddleware');
const ExcelJS = require('exceljs');

// GET /api/product-costs?company=xxx&type=international
const getProductCosts = async (req, res) => {
  try {
    const filter = {};
    if (req.query.company) filter.company = req.query.company;
    if (req.query.type) filter.type = req.query.type;

    const items = await ProductCost.find(filter)
      .populate('company', 'name')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });

    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/product-costs
const createProductCost = async (req, res) => {
  try {
    const {
      company,
      productName,
      type,
      measurementSize,
      qty,
      productPrice,
      chinaLocalCourierCharge,
      shippingCharge,
      bdCourierCharge,
      courierCharge,
      establishmentCost,
      packagingCost,
      localCourierCost,
      advertisingCost,
      profitPercent,
      note,
    } = req.body;

    if (!company || !productName || !type) {
      return res.status(400).json({ message: 'Company, product name and type are required' });
    }

    let image = null;
    let imagePublicId = null;
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer);
      image = result.url;
      imagePublicId = result.publicId;
    }

    const item = await ProductCost.create({
      company,
      productName,
      type,
      measurementSize: measurementSize || '',
      qty: qty || 1,
      productPrice: productPrice || 0,
      chinaLocalCourierCharge: type === 'international' ? (chinaLocalCourierCharge || 0) : 0,
      shippingCharge: shippingCharge || 0,
      bdCourierCharge: type === 'international' ? (bdCourierCharge || 0) : 0,
      courierCharge: type === 'national' ? (courierCharge || 0) : 0,
      establishmentCost: establishmentCost || 0,
      packagingCost: packagingCost || 0,
      localCourierCost: localCourierCost || 0,
      advertisingCost: advertisingCost || 0,
      profitPercent: profitPercent || 0,
      note,
      image,
      imagePublicId,
      createdBy: req.user._id,
    });

    const populated = await item.populate([
      { path: 'company', select: 'name' },
      { path: 'createdBy', select: 'name' },
    ]);

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/product-costs/:id
const updateProductCost = async (req, res) => {
  try {
    const item = await ProductCost.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Product cost not found' });

    const {
      productName,
      type,
      measurementSize,
      qty,
      productPrice,
      chinaLocalCourierCharge,
      shippingCharge,
      bdCourierCharge,
      courierCharge,
      establishmentCost,
      packagingCost,
      localCourierCost,
      advertisingCost,
      profitPercent,
      note,
    } = req.body;

    if (productName !== undefined) item.productName = productName;
    if (type !== undefined) item.type = type;
    if (measurementSize !== undefined) item.measurementSize = measurementSize;
    if (qty !== undefined) item.qty = qty;
    if (productPrice !== undefined) item.productPrice = productPrice;
    if (shippingCharge !== undefined) item.shippingCharge = shippingCharge;
    if (establishmentCost !== undefined) item.establishmentCost = establishmentCost;
    if (packagingCost !== undefined) item.packagingCost = packagingCost;
    if (localCourierCost !== undefined) item.localCourierCost = localCourierCost;
    if (advertisingCost !== undefined) item.advertisingCost = advertisingCost;
    if (profitPercent !== undefined) item.profitPercent = profitPercent;
    if (note !== undefined) item.note = note;

    const resolvedType = type !== undefined ? type : item.type;
    if (resolvedType === 'international') {
      if (chinaLocalCourierCharge !== undefined) item.chinaLocalCourierCharge = chinaLocalCourierCharge;
      if (bdCourierCharge !== undefined) item.bdCourierCharge = bdCourierCharge;
      item.courierCharge = 0;
    } else {
      if (courierCharge !== undefined) item.courierCharge = courierCharge;
      item.chinaLocalCourierCharge = 0;
      item.bdCourierCharge = 0;
    }

    // Handle image update
    if (req.file) {
      // Delete old image from Cloudinary if exists
      if (item.imagePublicId) {
        await deleteFromCloudinary(item.imagePublicId).catch(() => {});
      }
      const result = await uploadToCloudinary(req.file.buffer);
      item.image = result.url;
      item.imagePublicId = result.publicId;
    }

    // Allow clearing the image
    if (req.body.removeImage === 'true' && item.imagePublicId) {
      await deleteFromCloudinary(item.imagePublicId).catch(() => {});
      item.image = null;
      item.imagePublicId = null;
    }

    await item.save();

    const populated = await item.populate([
      { path: 'company', select: 'name' },
      { path: 'createdBy', select: 'name' },
    ]);

    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/product-costs/:id
const deleteProductCost = async (req, res) => {
  try {
    const item = await ProductCost.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: 'Product cost not found' });
    // Clean up Cloudinary image
    if (item.imagePublicId) {
      await deleteFromCloudinary(item.imagePublicId).catch(() => {});
    }
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Helper: build query from request
const buildFilter = (query) => {
  const filter = {};
  if (query.company) filter.company = query.company;
  if (query.type) filter.type = query.type;
  return filter;
};

// GET /api/product-costs/export/excel
const exportExcel = async (req, res) => {
  try {
    const items = await ProductCost.find(buildFilter(req.query))
      .populate('company', 'name')
      .sort({ createdAt: -1 });

    const wb = new ExcelJS.Workbook();
    wb.creator = 'HET HRM';
    wb.created = new Date();

    // ── Sheet 1: International ──────────────────────────────────────
    const wsIntl = wb.addWorksheet('International');

    // Title row
    wsIntl.mergeCells('A1:N1');
    const titleIntl = wsIntl.getCell('A1');
    titleIntl.value = 'Product Cost — International';
    titleIntl.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    titleIntl.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
    titleIntl.alignment = { horizontal: 'center', vertical: 'middle' };
    wsIntl.getRow(1).height = 30;

    // Header row
    const intlHeaders = [
      'SL', 'Product Name', 'Size/Measurement', 'Company', 'Qty',
      'Unit Price (৳)', 'China Local Courier (৳)', 'Shipping Charge (৳)', 'BD Courier Charge (৳)',
      'Total Cost (৳)', 'Unit Price After Receiving (৳)',
      'Estb Cost (৳)', 'Packaging (৳)', 'Local Courier (৳)', 'Advertising (৳)',
      'Profit %', 'Selling Price (৳)',
    ];
    const intlHeaderRow = wsIntl.addRow(intlHeaders);
    intlHeaderRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6366F1' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin' }, bottom: { style: 'thin' },
        left: { style: 'thin' }, right: { style: 'thin' },
      };
    });
    intlHeaderRow.height = 36;

    const intlItems = items.filter((i) => i.type === 'international');
    intlItems.forEach((item, idx) => {
      const row = wsIntl.addRow([
        idx + 1,
        item.productName,
        item.measurementSize || '',
        item.company?.name || '',
        item.qty || 1,
        item.productPrice || 0,
        item.chinaLocalCourierCharge || 0,
        item.shippingCharge || 0,
        item.bdCourierCharge || 0,
        item.totalCost || 0,
        item.unitPriceAfterReceiving || 0,
        item.establishmentCost || 0,
        item.packagingCost || 0,
        item.localCourierCost || 0,
        item.advertisingCost || 0,
        item.profitPercent || 0,
        item.sellingPrice || 0,
      ]);
      row.eachCell((cell, colNum) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        };
        if (idx % 2 === 1) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F3FF' } };
        }
        if (colNum >= 6 && colNum !== 16) cell.numFmt = '#,##0.00';
        if (colNum === 10) cell.font = { bold: true, color: { argb: 'FF4F46E5' } };
        if (colNum === 17) cell.font = { bold: true, color: { argb: 'FFDC2626' } };
      });
    });

    // Total row
    if (intlItems.length) {
      const totalRow = wsIntl.addRow([
        '', 'TOTAL', '', '', intlItems.reduce((s, i) => s + (i.qty || 1), 0),
        intlItems.reduce((s, i) => s + (i.productPrice || 0), 0),
        intlItems.reduce((s, i) => s + (i.chinaLocalCourierCharge || 0), 0),
        intlItems.reduce((s, i) => s + (i.shippingCharge || 0), 0),
        intlItems.reduce((s, i) => s + (i.bdCourierCharge || 0), 0),
        intlItems.reduce((s, i) => s + (i.totalCost || 0), 0),
        '', // unit price after receiving — no sum
        intlItems.reduce((s, i) => s + (i.establishmentCost || 0), 0),
        intlItems.reduce((s, i) => s + (i.packagingCost || 0), 0),
        intlItems.reduce((s, i) => s + (i.localCourierCost || 0), 0),
        intlItems.reduce((s, i) => s + (i.advertisingCost || 0), 0),
        '',
        intlItems.reduce((s, i) => s + (i.sellingPrice || 0), 0),
      ]);
      totalRow.eachCell((cell, colNum) => {
        cell.font = { bold: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E7FF' } };
        cell.border = { top: { style: 'thin' }, bottom: { style: 'double' }, left: { style: 'thin' }, right: { style: 'thin' } };
        if (colNum >= 6 && colNum !== 16) cell.numFmt = '#,##0.00';
      });
    }

    wsIntl.columns = [
      { width: 5 }, { width: 28 }, { width: 18 }, { width: 18 }, { width: 6 },
      { width: 16 }, { width: 20 }, { width: 16 }, { width: 18 },
      { width: 16 }, { width: 24 },
      { width: 14 }, { width: 14 }, { width: 16 }, { width: 14 },
      { width: 10 }, { width: 18 },
    ];

    // ── Sheet 2: National ──────────────────────────────────────────
    const wsNat = wb.addWorksheet('National');

    wsNat.mergeCells('A1:K1');
    const titleNat = wsNat.getCell('A1');
    titleNat.value = 'Product Cost — National';
    titleNat.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    titleNat.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } };
    titleNat.alignment = { horizontal: 'center', vertical: 'middle' };
    wsNat.getRow(1).height = 30;

    const natHeaders = [
      'SL', 'Product Name', 'Size/Measurement', 'Company', 'Qty',
      'Unit Price (৳)', 'Courier Charge (৳)', 'Shipping Charge (৳)',
      'Total Cost (৳)', 'Unit Price After Receiving (৳)',
      'Estb Cost (৳)', 'Packaging (৳)', 'Local Courier (৳)', 'Advertising (৳)',
      'Profit %', 'Selling Price (৳)',
    ];
    const natHeaderRow = wsNat.addRow(natHeaders);
    natHeaderRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    });
    natHeaderRow.height = 36;

    const natItems = items.filter((i) => i.type === 'national');
    natItems.forEach((item, idx) => {
      const row = wsNat.addRow([
        idx + 1,
        item.productName,
        item.measurementSize || '',
        item.company?.name || '',
        item.qty || 1,
        item.productPrice || 0,
        item.courierCharge || 0,
        item.shippingCharge || 0,
        item.totalCost || 0,
        item.unitPriceAfterReceiving || 0,
        item.establishmentCost || 0,
        item.packagingCost || 0,
        item.localCourierCost || 0,
        item.advertisingCost || 0,
        item.profitPercent || 0,
        item.sellingPrice || 0,
      ]);
      row.eachCell((cell, colNum) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        };
        if (idx % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } };
        if (colNum >= 6 && colNum !== 15) cell.numFmt = '#,##0.00';
        if (colNum === 9) cell.font = { bold: true, color: { argb: 'FF059669' } };
        if (colNum === 16) cell.font = { bold: true, color: { argb: 'FFDC2626' } };
      });
    });

    if (natItems.length) {
      const totalRow = wsNat.addRow([
        '', 'TOTAL', '', '', natItems.reduce((s, i) => s + (i.qty || 1), 0),
        natItems.reduce((s, i) => s + (i.productPrice || 0), 0),
        natItems.reduce((s, i) => s + (i.courierCharge || 0), 0),
        natItems.reduce((s, i) => s + (i.shippingCharge || 0), 0),
        natItems.reduce((s, i) => s + (i.totalCost || 0), 0),
        '',
        natItems.reduce((s, i) => s + (i.establishmentCost || 0), 0),
        natItems.reduce((s, i) => s + (i.packagingCost || 0), 0),
        natItems.reduce((s, i) => s + (i.localCourierCost || 0), 0),
        natItems.reduce((s, i) => s + (i.advertisingCost || 0), 0),
        '',
        natItems.reduce((s, i) => s + (i.sellingPrice || 0), 0),
      ]);
      totalRow.eachCell((cell, colNum) => {
        cell.font = { bold: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
        cell.border = { top: { style: 'thin' }, bottom: { style: 'double' }, left: { style: 'thin' }, right: { style: 'thin' } };
        if (colNum >= 6 && colNum !== 15) cell.numFmt = '#,##0.00';
      });
    }

    wsNat.columns = [
      { width: 5 }, { width: 28 }, { width: 18 }, { width: 18 }, { width: 6 },
      { width: 16 }, { width: 16 }, { width: 16 },
      { width: 16 }, { width: 24 },
      { width: 14 }, { width: 14 }, { width: 16 }, { width: 14 },
      { width: 10 }, { width: 18 },
    ];

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="product-cost.xlsx"');
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/product-costs/export/word
const exportWord = async (req, res) => {
  try {
    const items = await ProductCost.find(buildFilter(req.query))
      .populate('company', 'name')
      .sort({ createdAt: -1 });

    const intlItems = items.filter((i) => i.type === 'international');
    const natItems = items.filter((i) => i.type === 'national');

    const intlRows = intlItems.map((item, idx) => `
      <tr style="background:${idx % 2 === 0 ? '#fff' : '#f5f3ff'}">
        <td style="border:1px solid #ddd;padding:6px;text-align:center">${idx + 1}</td>
        <td style="border:1px solid #ddd;padding:6px">${item.productName}</td>
        <td style="border:1px solid #ddd;padding:6px">${item.measurementSize || '-'}</td>
        <td style="border:1px solid #ddd;padding:6px">${item.company?.name || ''}</td>
        <td style="border:1px solid #ddd;padding:6px;text-align:center">${item.qty || 1}</td>
        <td style="border:1px solid #ddd;padding:6px;text-align:right">${(item.productPrice || 0).toLocaleString()}</td>
        <td style="border:1px solid #ddd;padding:6px;text-align:right">${(item.chinaLocalCourierCharge || 0).toLocaleString()}</td>
        <td style="border:1px solid #ddd;padding:6px;text-align:right">${(item.shippingCharge || 0).toLocaleString()}</td>
        <td style="border:1px solid #ddd;padding:6px;text-align:right">${(item.bdCourierCharge || 0).toLocaleString()}</td>
        <td style="border:1px solid #ddd;padding:6px;text-align:right;font-weight:bold;color:#4f46e5">${(item.totalCost || 0).toLocaleString()}</td>
        <td style="border:1px solid #ddd;padding:6px;text-align:right">${(item.unitPriceAfterReceiving || 0).toLocaleString()}</td>
        <td style="border:1px solid #ddd;padding:6px;text-align:right">${(item.establishmentCost || 0).toLocaleString()}</td>
        <td style="border:1px solid #ddd;padding:6px;text-align:right">${(item.packagingCost || 0).toLocaleString()}</td>
        <td style="border:1px solid #ddd;padding:6px;text-align:right">${(item.localCourierCost || 0).toLocaleString()}</td>
        <td style="border:1px solid #ddd;padding:6px;text-align:right">${(item.advertisingCost || 0).toLocaleString()}</td>
        <td style="border:1px solid #ddd;padding:6px;text-align:right">${(item.profitPercent || 0)}%</td>
        <td style="border:1px solid #ddd;padding:6px;text-align:right;font-weight:bold;color:#7c3aed">${(item.sellingPrice || 0).toLocaleString()}</td>
      </tr>`).join('');

    const intlTotal = {
      productPrice: intlItems.reduce((s, i) => s + (i.productPrice || 0), 0),
      chinaLocal: intlItems.reduce((s, i) => s + (i.chinaLocalCourierCharge || 0), 0),
      shipping: intlItems.reduce((s, i) => s + (i.shippingCharge || 0), 0),
      bdCourier: intlItems.reduce((s, i) => s + (i.bdCourierCharge || 0), 0),
      total: intlItems.reduce((s, i) => s + (i.totalCost || 0), 0),
      estb: intlItems.reduce((s, i) => s + (i.establishmentCost || 0), 0),
      packaging: intlItems.reduce((s, i) => s + (i.packagingCost || 0), 0),
      localCourier: intlItems.reduce((s, i) => s + (i.localCourierCost || 0), 0),
      advertising: intlItems.reduce((s, i) => s + (i.advertisingCost || 0), 0),
      sellingPrice: intlItems.reduce((s, i) => s + (i.sellingPrice || 0), 0),
    };

    const natRows = natItems.map((item, idx) => `
      <tr style="background:${idx % 2 === 0 ? '#fff' : '#f0fdf4'}">
        <td style="border:1px solid #ddd;padding:6px;text-align:center">${idx + 1}</td>
        <td style="border:1px solid #ddd;padding:6px">${item.productName}</td>
        <td style="border:1px solid #ddd;padding:6px">${item.measurementSize || '-'}</td>
        <td style="border:1px solid #ddd;padding:6px">${item.company?.name || ''}</td>
        <td style="border:1px solid #ddd;padding:6px;text-align:center">${item.qty || 1}</td>
        <td style="border:1px solid #ddd;padding:6px;text-align:right">${(item.productPrice || 0).toLocaleString()}</td>
        <td style="border:1px solid #ddd;padding:6px;text-align:right">${(item.courierCharge || 0).toLocaleString()}</td>
        <td style="border:1px solid #ddd;padding:6px;text-align:right">${(item.shippingCharge || 0).toLocaleString()}</td>
        <td style="border:1px solid #ddd;padding:6px;text-align:right;font-weight:bold;color:#059669">${(item.totalCost || 0).toLocaleString()}</td>
        <td style="border:1px solid #ddd;padding:6px;text-align:right">${(item.unitPriceAfterReceiving || 0).toLocaleString()}</td>
        <td style="border:1px solid #ddd;padding:6px;text-align:right">${(item.establishmentCost || 0).toLocaleString()}</td>
        <td style="border:1px solid #ddd;padding:6px;text-align:right">${(item.packagingCost || 0).toLocaleString()}</td>
        <td style="border:1px solid #ddd;padding:6px;text-align:right">${(item.localCourierCost || 0).toLocaleString()}</td>
        <td style="border:1px solid #ddd;padding:6px;text-align:right">${(item.advertisingCost || 0).toLocaleString()}</td>
        <td style="border:1px solid #ddd;padding:6px;text-align:right">${(item.profitPercent || 0)}%</td>
        <td style="border:1px solid #ddd;padding:6px;text-align:right;font-weight:bold;color:#7c3aed">${(item.sellingPrice || 0).toLocaleString()}</td>
      </tr>`).join('');

    const natTotal = {
      productPrice: natItems.reduce((s, i) => s + (i.productPrice || 0), 0),
      courier: natItems.reduce((s, i) => s + (i.courierCharge || 0), 0),
      shipping: natItems.reduce((s, i) => s + (i.shippingCharge || 0), 0),
      total: natItems.reduce((s, i) => s + (i.totalCost || 0), 0),
      estb: natItems.reduce((s, i) => s + (i.establishmentCost || 0), 0),
      packaging: natItems.reduce((s, i) => s + (i.packagingCost || 0), 0),
      localCourier: natItems.reduce((s, i) => s + (i.localCourierCost || 0), 0),
      advertising: natItems.reduce((s, i) => s + (i.advertisingCost || 0), 0),
      sellingPrice: natItems.reduce((s, i) => s + (i.sellingPrice || 0), 0),
    };

    const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body { font-family: 'Calibri', Arial, sans-serif; margin: 30px; color: #111; font-size: 12px; }
  h1 { color: #4f46e5; font-size: 20px; margin-bottom: 4px; }
  h2 { font-size: 15px; margin-top: 28px; margin-bottom: 8px; padding: 6px 12px; color: #fff; border-radius: 4px; }
  h2.intl { background: #4f46e5; }
  h2.nat  { background: #059669; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 8px; }
  th { padding: 7px 5px; text-align: center; color: #fff; }
  th.intl { background: #6366f1; border: 1px solid #4f46e5; }
  th.nat  { background: #10b981; border: 1px solid #059669; }
  td { border: 1px solid #ddd; padding: 6px 5px; }
  tr.total td { font-weight: bold; background: #e0e7ff; border-top: 2px solid #4f46e5; }
  tr.total-nat td { font-weight: bold; background: #d1fae5; border-top: 2px solid #059669; }
  .generated { font-size: 10px; color: #888; margin-top: 30px; }
</style>
</head>
<body>
<h1>Product Cost Report</h1>
<p style="color:#888;font-size:12px">Generated: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</p>

<h2 class="intl">International Products</h2>
<table>
  <thead>
    <tr>
      <th class="intl">SL</th>
      <th class="intl">Product Name</th>
      <th class="intl">Size</th>
      <th class="intl">Company</th>
      <th class="intl">Qty</th>
      <th class="intl">Unit Price (৳)</th>
      <th class="intl">China Courier (৳)</th>
      <th class="intl">Shipping (৳)</th>
      <th class="intl">BD Courier (৳)</th>
      <th class="intl">Total Cost (৳)</th>
      <th class="intl">Unit/After Rcv (৳)</th>
      <th class="intl">Estb (৳)</th>
      <th class="intl">Pkg (৳)</th>
      <th class="intl">Local Courier (৳)</th>
      <th class="intl">Adv (৳)</th>
      <th class="intl">Profit %</th>
      <th class="intl">Selling Price (৳)</th>
    </tr>
  </thead>
  <tbody>
    ${intlRows || '<tr><td colspan="17" style="text-align:center;color:#aaa;padding:16px">No international products</td></tr>'}
    <tr class="total">
      <td></td><td>TOTAL</td><td></td><td></td><td></td>
      <td style="text-align:right">${intlTotal.productPrice.toLocaleString()}</td>
      <td style="text-align:right">${intlTotal.chinaLocal.toLocaleString()}</td>
      <td style="text-align:right">${intlTotal.shipping.toLocaleString()}</td>
      <td style="text-align:right">${intlTotal.bdCourier.toLocaleString()}</td>
      <td style="text-align:right;color:#4f46e5">${intlTotal.total.toLocaleString()}</td>
      <td></td>
      <td style="text-align:right">${intlTotal.estb.toLocaleString()}</td>
      <td style="text-align:right">${intlTotal.packaging.toLocaleString()}</td>
      <td style="text-align:right">${intlTotal.localCourier.toLocaleString()}</td>
      <td style="text-align:right">${intlTotal.advertising.toLocaleString()}</td>
      <td></td>
      <td style="text-align:right;color:#7c3aed">${intlTotal.sellingPrice.toLocaleString()}</td>
    </tr>
  </tbody>
</table>

<h2 class="nat">National Products</h2>
<table>
  <thead>
    <tr>
      <th class="nat">SL</th>
      <th class="nat">Product Name</th>
      <th class="nat">Size</th>
      <th class="nat">Company</th>
      <th class="nat">Qty</th>
      <th class="nat">Unit Price (৳)</th>
      <th class="nat">Courier (৳)</th>
      <th class="nat">Shipping (৳)</th>
      <th class="nat">Total Cost (৳)</th>
      <th class="nat">Unit/After Rcv (৳)</th>
      <th class="nat">Estb (৳)</th>
      <th class="nat">Pkg (৳)</th>
      <th class="nat">Local Courier (৳)</th>
      <th class="nat">Adv (৳)</th>
      <th class="nat">Profit %</th>
      <th class="nat">Selling Price (৳)</th>
    </tr>
  </thead>
  <tbody>
    ${natRows || '<tr><td colspan="16" style="text-align:center;color:#aaa;padding:16px">No national products</td></tr>'}
    <tr class="total-nat">
      <td></td><td>TOTAL</td><td></td><td></td><td></td>
      <td style="text-align:right">${natTotal.productPrice.toLocaleString()}</td>
      <td style="text-align:right">${natTotal.courier.toLocaleString()}</td>
      <td style="text-align:right">${natTotal.shipping.toLocaleString()}</td>
      <td style="text-align:right;color:#059669">${natTotal.total.toLocaleString()}</td>
      <td></td>
      <td style="text-align:right">${natTotal.estb.toLocaleString()}</td>
      <td style="text-align:right">${natTotal.packaging.toLocaleString()}</td>
      <td style="text-align:right">${natTotal.localCourier.toLocaleString()}</td>
      <td style="text-align:right">${natTotal.advertising.toLocaleString()}</td>
      <td></td>
      <td style="text-align:right;color:#7c3aed">${natTotal.sellingPrice.toLocaleString()}</td>
    </tr>
  </tbody>
</table>

<p class="generated">HET HRM System — Product Cost Report</p>
</body>
</html>`;

    res.setHeader('Content-Type', 'application/msword');
    res.setHeader('Content-Disposition', 'attachment; filename="product-cost.doc"');
    res.send(html);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getProductCosts, createProductCost, updateProductCost, deleteProductCost, exportExcel, exportWord };
