// Renders a barcode as an <img>, using a free barcode-rendering API — same
// pattern already used for QR codes on shipping labels (api.qrserver.com).
// No client-side barcode library needed.
const BarcodeImage = ({ value, height = 40 }) => {
  if (!value) return null;
  const url = `https://barcodeapi.org/api/128/${encodeURIComponent(value)}`;
  return (
    <img
      src={url}
      alt={value}
      style={{ height }}
      className="mx-auto"
    />
  );
};

export default BarcodeImage;
