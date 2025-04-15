const express = require('express');
const router = express.Router();
const VendorListController = require('../../controllers/VendorListController');
const { validateRequest } = require('../../middleware/validateRequest');
const { vendorValidation } = require('../../validations/vendor.validation');
const { protect, restrictTo } = require('../../middleware/auth');
const { cacheControl } = require('../../middleware/cache');

// Rutas públicas (con caché)
router.get(
  '/list',
  cacheControl('1 hour'),
  validateRequest(vendorValidation.getVendorList),
  VendorListController.getLatestVendorList
);

router.get(
  '/list/:version',
  cacheControl('1 day'),
  validateRequest(vendorValidation.getVendorListVersion),
  VendorListController.getVendorListVersion
);

router.get(
  '/vendor/:vendorId',
  cacheControl('1 hour'),
  validateRequest(vendorValidation.getVendorInfo),
  VendorListController.getVendorInfo
);

router.get(
  '/search',
  validateRequest(vendorValidation.searchVendors),
  VendorListController.searchVendors
);

// Rutas protegidas
router.use(protect);

router.get(
  '/stats',
  restrictTo('admin'),
  VendorListController.getVendorStats
);

router.post(
  '/update',
  restrictTo('admin'),
  VendorListController.forceUpdate
);

router.get(
  '/changes',
  validateRequest(vendorValidation.getVersionChanges),
  VendorListController.getVersionChanges
);

module.exports = router;