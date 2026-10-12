using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;

class IconBuilder {
    static void Main(string[] args) {
        string outputPath = args.Length > 0 ? args[0] : "arka.ico";
        int[] sizes = new int[] { 256, 128, 64, 48, 32, 16 };
        
        using (MemoryStream ms = new MemoryStream())
        using (BinaryWriter bw = new BinaryWriter(ms)) {
            // ICO Header
            bw.Write((short)0); // reserved
            bw.Write((short)1); // icon type (1 = ICO)
            bw.Write((short)sizes.Length); // number of images

            long directoryOffset = ms.Position;
            // Reserve space for entries (16 bytes per image)
            for (int i = 0; i < sizes.Length; i++) {
                bw.Write(new byte[16]);
            }

            int currentOffset = (int)ms.Position;

            for (int i = 0; i < sizes.Length; i++) {
                int s = sizes[i];
                byte[] pngBytes;

                using (Bitmap bmp = new Bitmap(s, s))
                using (Graphics g = Graphics.FromImage(bmp)) {
                    g.SmoothingMode = SmoothingMode.AntiAlias;
                    g.InterpolationMode = InterpolationMode.HighQualityBicubic;
                    g.PixelOffsetMode = PixelOffsetMode.HighQuality;

                    // Background: Rounded rectangle with Arka Emerald Green (#16634b)
                    int pad = Math.Max(1, s / 18);
                    int r = Math.Max(2, s / 5);
                    int d = r * 2;
                    Rectangle rect = new Rectangle(pad, pad, s - pad * 2, s - pad * 2);

                    using (GraphicsPath gp = new GraphicsPath()) {
                        gp.AddArc(rect.X, rect.Y, d, d, 180, 90);
                        gp.AddArc(rect.Right - d, rect.Y, d, d, 270, 90);
                        gp.AddArc(rect.Right - d, rect.Bottom - d, d, d, 0, 90);
                        gp.AddArc(rect.X, rect.Bottom - d, d, d, 90, 90);
                        gp.CloseFigure();

                        using (SolidBrush bgBrush = new SolidBrush(Color.FromArgb(22, 99, 75))) {
                            g.FillPath(bgBrush, gp);
                        }

                        // Subtle inner border
                        using (Pen borderPen = new Pen(Color.FromArgb(38, 142, 109), Math.Max(1, s / 64))) {
                            g.DrawPath(borderPen, gp);
                        }
                    }

                    // Gold Letter "A"
                    using (SolidBrush textBrush = new SolidBrush(Color.FromArgb(226, 196, 141))) {
                        float fontSize = s * 0.58f;
                        using (Font f = new Font("Arial", fontSize, FontStyle.Bold, GraphicsUnit.Pixel)) {
                            StringFormat sf = new StringFormat {
                                Alignment = StringAlignment.Center,
                                LineAlignment = StringAlignment.Center
                            };
                            // Center offset calculation
                            float yOffset = s * 0.49f;
                            g.DrawString("A", f, textBrush, s * 0.50f, yOffset, sf);
                        }
                    }

                    using (MemoryStream pngMs = new MemoryStream()) {
                        bmp.Save(pngMs, ImageFormat.Png);
                        pngBytes = pngMs.ToArray();
                    }
                }

                // Write PNG data at end
                int imageOffset = (int)ms.Position;
                bw.Write(pngBytes);

                // Seek back to directory entry
                long returnPos = ms.Position;
                ms.Seek(directoryOffset + (i * 16), SeekOrigin.Begin);

                bw.Write((byte)(s >= 256 ? 0 : s)); // Width
                bw.Write((byte)(s >= 256 ? 0 : s)); // Height
                bw.Write((byte)0); // Color palette
                bw.Write((byte)0); // Reserved
                bw.Write((short)1); // Color planes
                bw.Write((short)32); // Bits per pixel
                bw.Write((int)pngBytes.Length); // Image size in bytes
                bw.Write((int)imageOffset); // Image data offset

                ms.Seek(returnPos, SeekOrigin.Begin);
            }

            File.WriteAllBytes(outputPath, ms.ToArray());
            Console.WriteLine("Icon created successfully at: " + outputPath);
        }
    }
}
