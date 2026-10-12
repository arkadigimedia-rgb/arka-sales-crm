using System;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Windows.Forms;

namespace ArkaSalesCRM {
    static class Program {
        [DllImport("user32.dll")]
        [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool SetForegroundWindow(IntPtr hWnd);

        [DllImport("user32.dll")]
        private static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

        private const int SW_RESTORE = 9;
        private const string AppUrl = "https://sales.arkadigitalmedia.in";

        [STAThread]
        static void Main(string[] args) {
            try {
                LaunchApplication();
            } catch (Exception ex) {
                MessageBox.Show(
                    "Error launching ARKA Sales CRM:\n\n" + ex.Message,
                    "ARKA Sales CRM",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
            }
        }

        private static void LaunchApplication() {
            string browserPath = FindChromiumBrowser();
            string profileDir = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "ArkaSalesCRM",
                "Profile"
            );

            try {
                if (!Directory.Exists(profileDir)) {
                    Directory.CreateDirectory(profileDir);
                }
            } catch {
                // If profile directory cannot be created, proceed with default
            }

            if (!string.IsNullOrEmpty(browserPath) && File.Exists(browserPath)) {
                // Launch in standalone desktop app mode
                ProcessStartInfo psi = new ProcessStartInfo {
                    FileName = browserPath,
                    Arguments = string.Format(
                        "--app=\"{0}\" --user-data-dir=\"{1}\" --window-size=1440,900 --no-first-run --no-default-browser-check",
                        AppUrl,
                        profileDir
                    ),
                    UseShellExecute = false
                };

                Process.Start(psi);
            } else {
                // Fallback to default browser
                ProcessStartInfo fallback = new ProcessStartInfo {
                    FileName = AppUrl,
                    UseShellExecute = true
                };
                Process.Start(fallback);
            }
        }

        private static string FindChromiumBrowser() {
            string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            string programFiles = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);
            string programFilesX86 = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86);

            string[] candidates = new string[] {
                // Microsoft Edge (Standard on Windows 10 & 11)
                Path.Combine(programFilesX86, @"Microsoft\Edge\Application\msedge.exe"),
                Path.Combine(programFiles, @"Microsoft\Edge\Application\msedge.exe"),
                Path.Combine(localAppData, @"Microsoft\Edge\Application\msedge.exe"),

                // Google Chrome
                Path.Combine(programFiles, @"Google\Chrome\Application\chrome.exe"),
                Path.Combine(programFilesX86, @"Google\Chrome\Application\chrome.exe"),
                Path.Combine(localAppData, @"Google\Chrome\Application\chrome.exe"),

                // Brave Browser
                Path.Combine(programFiles, @"BraveSoftware\Brave-Browser\Application\brave.exe"),
                Path.Combine(programFilesX86, @"BraveSoftware\Brave-Browser\Application\brave.exe"),
                Path.Combine(localAppData, @"BraveSoftware\Brave-Browser\Application\brave.exe")
            };

            foreach (string candidate in candidates) {
                if (!string.IsNullOrEmpty(candidate) && File.Exists(candidate)) {
                    return candidate;
                }
            }

            return null;
        }
    }
}
