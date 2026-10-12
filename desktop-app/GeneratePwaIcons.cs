using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;

class PwaIconGenerator {
    static void Main() {
        string iconsDir = @"public\icons";
        if (!Directory.Exists(iconsDir)) {
            Directory.CreateDirectory(iconsDir);
        }

        GenerateIcon(192, Path.Combine(iconsDir, "icon-192x192.png"));
        GenerateIcon(512, Path.Combine(iconsDir, "icon-512x512.png"));
        GenerateIcon(180, Path.Combine(iconsDir, "apple-touch-icon.png"));
        GenerateIcon(64, @"public\favicon.ico", true);

        Console.WriteLine("PWA and Apple touch icons generated successfully!");
    }

    static void GenerateIcon(int s, string outPath, bool isFavicon = false) {
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
                    float yOffset = s * 0.49f;
                    g.DrawString("A", f, textBrush, s * 0.50f, yOffset, sf);
                }
            }

            if (isFavicon) {
                using (Icon icon = Icon.FromHandle(bmp.GetHicon()))
                using (FileStream fs = File.Create(outPath)) {
                    icon.Save(fs);
                }
            } else {
                bmp.Save(outPath, ImageFormat.Png);
            }
        }
    }
}
