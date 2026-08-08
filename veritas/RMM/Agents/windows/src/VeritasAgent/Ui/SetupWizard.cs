using System.Diagnostics;
using System.Reflection;
using System.Security.Principal;
using System.ServiceProcess;
using VeritasAgent.Models;
using VeritasAgent.Services;

namespace VeritasAgent.Ui;

internal static class SetupWizard
{
    [STAThread]
    public static int Run()
    {
        if (!IsElevated())
        {
            try
            {
                var psi = new ProcessStartInfo
                {
                    FileName = Environment.ProcessPath ?? "VeritasAgent.exe",
                    Arguments = "--configure",
                    UseShellExecute = true,
                    Verb = "runas",
                    WorkingDirectory = AppContext.BaseDirectory
                };
                Process.Start(psi);
                return 0;
            }
            catch
            {
                MessageBox.Show(
                    "Administrator privileges are required to configure Veritas Agent.",
                    "Veritas Agent",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Warning);
                return 2;
            }
        }

        ApplicationConfiguration.Initialize();
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);

        using var form = new SetupForm();
        Application.Run(form);
        return form.ExitCode;
    }

    private static bool IsElevated()
    {
        using var identity = WindowsIdentity.GetCurrent();
        return new WindowsPrincipal(identity).IsInRole(WindowsBuiltInRole.Administrator);
    }
}

internal sealed class SetupForm : Form
{
    private enum Step { Language, License, Configure, Test }

    private Step _step = Step.Language;
    private string _lang = "fr";
    private string _pendingApiUrl = "";
    private string _pendingToken = "";
    private string _pendingFamily = "ordinateurs";
    private EnrollPreviewResponse? _preview;

    private readonly PictureBox _banner;
    private readonly Label _stepTitle;
    private readonly Label _stepHint;
    private readonly Panel _content;
    private readonly Panel _footer;
    private readonly Button _backBtn;
    private readonly Button _nextBtn;
    private readonly Label _status;

    private readonly Panel _langPanel;
    private readonly RadioButton _rbFr;
    private readonly RadioButton _rbEn;
    private readonly RadioButton _rbEs;

    private readonly Panel _licensePanel;
    private readonly TextBox _licenseText;
    private readonly CheckBox _acceptLicense;

    private readonly Panel _configPanel;
    private readonly Label _hostLabel;
    private readonly TextBox _host;
    private readonly Label _portLabel;
    private readonly NumericUpDown _port;
    private readonly Label _schemeLabel;
    private readonly ComboBox _scheme;
    private readonly Label _urlPreview;
    private readonly Label _tokenLabel;
    private readonly TextBox _token;
    private readonly Label _familyLabel;
    private readonly ComboBox _family;

    private const int DefaultApiPort = 3001;

    private readonly Panel _testPanel;
    private readonly Label _testStatus;
    private readonly Label _testDetails;
    private readonly ProgressBar _testProgress;

    public int ExitCode { get; private set; } = 1;

    public SetupForm()
    {
        Text = "Veritas Agent";
        ClientSize = new Size(640, 580);
        MinimumSize = new Size(640, 580);
        FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox = false;
        MinimizeBox = false;
        StartPosition = FormStartPosition.CenterScreen;
        Font = new Font("Segoe UI", 10F);
        BackColor = Color.White;
        Padding = new Padding(0);
        try
        {
            var icoPath = Path.Combine(AppContext.BaseDirectory, "Assets", "veritas-agent.ico");
            if (!File.Exists(icoPath))
                icoPath = Path.Combine(AppContext.BaseDirectory, "veritas-agent.ico");
            if (File.Exists(icoPath))
                Icon = new Icon(icoPath);
        }
        catch { /* ignore */ }

        _banner = new PictureBox
        {
            Dock = DockStyle.Top,
            Height = 96,
            SizeMode = PictureBoxSizeMode.Zoom,
            BackColor = Color.FromArgb(15, 28, 46),
            Image = LoadBanner()
        };

        _stepTitle = new Label
        {
            AutoSize = false,
            Font = new Font("Segoe UI Semibold", 15F),
            Location = new Point(32, 112),
            Size = new Size(576, 30),
            ForeColor = Color.FromArgb(15, 23, 42)
        };
        _stepHint = new Label
        {
            AutoSize = false,
            ForeColor = Color.FromArgb(100, 116, 139),
            Location = new Point(32, 144),
            Size = new Size(576, 36)
        };

        _content = new Panel
        {
            Location = new Point(32, 188),
            Size = new Size(576, 300),
            BackColor = Color.White
        };

        // Language
        _langPanel = new Panel { Dock = DockStyle.Fill };
        _rbFr = MakeLangRadio("Français", 12, true);
        _rbEn = MakeLangRadio("English", 52, false);
        _rbEs = MakeLangRadio("Español", 92, false);
        _rbFr.CheckedChanged += (_, _) => { if (_rbFr.Checked) SetLang("fr"); };
        _rbEn.CheckedChanged += (_, _) => { if (_rbEn.Checked) SetLang("en"); };
        _rbEs.CheckedChanged += (_, _) => { if (_rbEs.Checked) SetLang("es"); };
        _langPanel.Controls.AddRange(new Control[] { _rbFr, _rbEn, _rbEs });

        // License
        _licensePanel = new Panel { Dock = DockStyle.Fill, Visible = false };
        _licenseText = new TextBox
        {
            Multiline = true,
            ReadOnly = true,
            ScrollBars = ScrollBars.Vertical,
            BorderStyle = BorderStyle.FixedSingle,
            Location = new Point(0, 0),
            Size = new Size(576, 230),
            BackColor = Color.FromArgb(248, 250, 252),
            Font = new Font("Segoe UI", 9.25F),
            WordWrap = true
        };
        _acceptLicense = new CheckBox
        {
            AutoSize = true,
            Location = new Point(0, 246),
            Font = new Font("Segoe UI", 10F)
        };
        _acceptLicense.CheckedChanged += (_, _) => UpdateButtons();
        _licensePanel.Controls.Add(_licenseText);
        _licensePanel.Controls.Add(_acceptLicense);

        // Configure — host + port (API default 3001), not the frontend :3000
        _configPanel = new Panel { Dock = DockStyle.Fill, Visible = false };
        _schemeLabel = MakeFieldLabel(0);
        _scheme = new ComboBox
        {
            DropDownStyle = ComboBoxStyle.DropDownList,
            Width = 100,
            Location = new Point(0, 26)
        };
        _scheme.Items.AddRange(new object[] { "http", "https" });
        _scheme.SelectedIndex = 0;
        _scheme.SelectedIndexChanged += (_, _) => RefreshUrlPreview();

        _hostLabel = MakeFieldLabel(0);
        _hostLabel.Location = new Point(116, 0);
        _host = new TextBox
        {
            Width = 340,
            Height = 28,
            Location = new Point(116, 26)
        };
        _host.TextChanged += (_, _) => RefreshUrlPreview();

        _portLabel = MakeFieldLabel(0);
        _portLabel.Location = new Point(472, 0);
        _port = new NumericUpDown
        {
            Minimum = 1,
            Maximum = 65535,
            Value = DefaultApiPort,
            Width = 104,
            Location = new Point(472, 26),
            TextAlign = HorizontalAlignment.Left
        };
        _port.ValueChanged += (_, _) => RefreshUrlPreview();

        _urlPreview = new Label
        {
            AutoSize = false,
            Location = new Point(0, 58),
            Size = new Size(576, 22),
            ForeColor = Color.FromArgb(100, 116, 139),
            Font = new Font("Segoe UI", 9F)
        };

        _tokenLabel = MakeFieldLabel(90);
        _token = new TextBox { Width = 576, Height = 28, Location = new Point(0, 116) };
        _familyLabel = MakeFieldLabel(160);
        _family = new ComboBox
        {
            DropDownStyle = ComboBoxStyle.DropDownList,
            Width = 576,
            Location = new Point(0, 186)
        };
        ApplyGuessedServer(TryGuessApiUrl());
        RefreshUrlPreview();
        _configPanel.Controls.AddRange(new Control[]
        {
            _schemeLabel, _scheme,
            _hostLabel, _host,
            _portLabel, _port,
            _urlPreview,
            _tokenLabel, _token,
            _familyLabel, _family
        });

        // Test
        _testPanel = new Panel { Dock = DockStyle.Fill, Visible = false };
        _testProgress = new ProgressBar
        {
            Style = ProgressBarStyle.Marquee,
            MarqueeAnimationSpeed = 30,
            Location = new Point(0, 8),
            Size = new Size(576, 8),
            Visible = false
        };
        _testStatus = new Label
        {
            AutoSize = false,
            Font = new Font("Segoe UI Semibold", 11F),
            Location = new Point(0, 28),
            Size = new Size(576, 28),
            ForeColor = Color.FromArgb(15, 23, 42)
        };
        _testDetails = new Label
        {
            AutoSize = false,
            Location = new Point(0, 64),
            Size = new Size(576, 220),
            ForeColor = Color.FromArgb(51, 65, 85),
            Font = new Font("Segoe UI", 10F)
        };
        _testPanel.Controls.Add(_testProgress);
        _testPanel.Controls.Add(_testStatus);
        _testPanel.Controls.Add(_testDetails);

        _content.Controls.Add(_langPanel);
        _content.Controls.Add(_licensePanel);
        _content.Controls.Add(_configPanel);
        _content.Controls.Add(_testPanel);

        _footer = new Panel
        {
            Dock = DockStyle.Bottom,
            Height = 72,
            BackColor = Color.FromArgb(248, 250, 252)
        };
        _footer.Paint += (_, e) =>
        {
            using var pen = new Pen(Color.FromArgb(226, 232, 240));
            e.Graphics.DrawLine(pen, 0, 0, _footer.Width, 0);
        };

        _status = new Label
        {
            AutoSize = false,
            Location = new Point(24, 18),
            Size = new Size(300, 36),
            ForeColor = Color.FromArgb(180, 40, 40),
            Anchor = AnchorStyles.Left | AnchorStyles.Top | AnchorStyles.Right
        };

        // FlowLayout RightToLeft: Anchor=Right before the docked footer has its final
        // width pushes buttons off-screen (empty footer).
        var buttonBar = new FlowLayoutPanel
        {
            FlowDirection = FlowDirection.RightToLeft,
            WrapContents = false,
            AutoSize = false,
            Dock = DockStyle.Right,
            Width = 290,
            Padding = new Padding(0, 14, 20, 0),
            BackColor = Color.Transparent
        };

        _backBtn = MakeFooterButton(false);
        _backBtn.Margin = new Padding(8, 0, 0, 0);
        _backBtn.Click += (_, _) => GoBack();

        _nextBtn = MakeFooterButton(true);
        _nextBtn.Margin = new Padding(0, 0, 0, 0);
        _nextBtn.Click += (_, _) => _ = GoNextAsync();

        // RightToLeft → first added is rightmost
        buttonBar.Controls.Add(_nextBtn);
        buttonBar.Controls.Add(_backBtn);

        _footer.Controls.Add(_status);
        _footer.Controls.Add(buttonBar);

        Controls.Add(_footer);
        Controls.Add(_banner);
        Controls.Add(_content);
        Controls.Add(_stepTitle);
        Controls.Add(_stepHint);

        AcceptButton = _nextBtn;
        Load += (_, _) => LayoutBody();
        Resize += (_, _) => LayoutBody();
        ApplyLanguage();
        ShowStep(Step.Language);
    }

    private void LayoutBody()
    {
        var top = _banner.Bottom + 16;
        var bottom = _footer.Top - 12;
        _stepTitle.SetBounds(32, top, Math.Max(100, ClientSize.Width - 64), 30);
        _stepHint.SetBounds(32, top + 32, Math.Max(100, ClientSize.Width - 64), 36);
        var contentTop = top + 72;
        var contentHeight = Math.Max(120, bottom - contentTop);
        _content.SetBounds(32, contentTop, Math.Max(100, ClientSize.Width - 64), contentHeight);
        _status.Width = Math.Max(80, ClientSize.Width - 340);
    }

    private static RadioButton MakeLangRadio(string text, int top, bool check) => new()
    {
        Text = text,
        Checked = check,
        AutoSize = true,
        Location = new Point(8, top),
        Font = new Font("Segoe UI", 11F),
        Cursor = Cursors.Hand
    };

    private static Label MakeFieldLabel(int top) => new()
    {
        AutoSize = true,
        Location = new Point(0, top),
        Font = new Font("Segoe UI Semibold", 9.5F),
        ForeColor = Color.FromArgb(30, 41, 59)
    };

    private static Button MakeFooterButton(bool primary)
    {
        var btn = new Button
        {
            Size = new Size(110, 40),
            MinimumSize = new Size(110, 40),
            MaximumSize = new Size(200, 40),
            AutoSize = false,
            FlatStyle = FlatStyle.Flat,
            Cursor = Cursors.Hand,
            Font = new Font("Segoe UI Semibold", 10F),
            UseVisualStyleBackColor = false,
            TextAlign = ContentAlignment.MiddleCenter
        };
        if (primary)
        {
            btn.Size = new Size(150, 40);
            btn.MinimumSize = new Size(150, 40);
            btn.BackColor = Color.FromArgb(37, 99, 235);
            btn.ForeColor = Color.White;
            btn.FlatAppearance.BorderSize = 0;
            btn.FlatAppearance.MouseOverBackColor = Color.FromArgb(29, 78, 216);
        }
        else
        {
            btn.BackColor = Color.White;
            btn.ForeColor = Color.FromArgb(30, 41, 59);
            btn.FlatAppearance.BorderColor = Color.FromArgb(203, 213, 225);
            btn.FlatAppearance.BorderSize = 1;
            btn.FlatAppearance.MouseOverBackColor = Color.FromArgb(241, 245, 249);
        }
        return btn;
    }

    private void SetLang(string lang)
    {
        _lang = lang;
        ApplyLanguage();
    }

    private static Image LoadBanner()
    {
        try
        {
            var asm = Assembly.GetExecutingAssembly();
            var name = asm.GetManifestResourceNames()
                .FirstOrDefault(n => n.EndsWith("veritas-banner.png", StringComparison.OrdinalIgnoreCase));
            if (name is not null)
            {
                using var stream = asm.GetManifestResourceStream(name);
                if (stream is not null) return Image.FromStream(stream);
            }
            var path = Path.Combine(AppContext.BaseDirectory, "Assets", "veritas-banner.png");
            if (File.Exists(path)) return Image.FromFile(path);
        }
        catch { /* fall through */ }
        return CreateFallbackBanner();
    }

    private static Image CreateFallbackBanner()
    {
        var bmp = new Bitmap(1240, 176);
        using var g = Graphics.FromImage(bmp);
        g.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.AntiAlias;
        g.Clear(Color.FromArgb(15, 28, 46));
        using (var icon = new SolidBrush(Color.FromArgb(43, 95, 171)))
            g.FillRectangle(icon, 56, 48, 80, 80);
        using var fontV = new Font("Segoe UI", 28F, FontStyle.Bold);
        g.DrawString("V", fontV, Brushes.White, 74, 62);
        using var font = new Font("Segoe UI", 28F, FontStyle.Bold);
        using var text = new SolidBrush(Color.FromArgb(232, 237, 245));
        g.DrawString("VERITAS", font, text, 160, 52);
        using var subFont = new Font("Segoe UI", 12F, FontStyle.Regular);
        using var sub = new SolidBrush(Color.FromArgb(148, 163, 184));
        g.DrawString("Agent", subFont, sub, 162, 108);
        return bmp;
    }

    private string T(string key) => Strings.Get(_lang, key);

    private void ApplyLanguage()
    {
        Text = T("windowTitle");
        _licenseText.Text = Strings.GetEula(_lang);
        _acceptLicense.Text = T("acceptEula");
        _schemeLabel.Text = T("scheme");
        _hostLabel.Text = T("serverHost");
        _portLabel.Text = T("serverPort");
        _host.PlaceholderText = T("hostPlaceholder");
        _tokenLabel.Text = T("token");
        _token.PlaceholderText = T("tokenPlaceholder");
        _familyLabel.Text = T("equipmentType");
        RefreshUrlPreview();
        var selected = _family.SelectedIndex;
        _family.Items.Clear();
        _family.Items.Add(T("familyWorkstation"));
        _family.Items.Add(T("familyServer"));
        _family.SelectedIndex = selected >= 0 ? selected : 0;
        if (_preview is not null && _step == Step.Test)
            RenderPreview(_preview);
        RefreshStepChrome();
        UpdateButtons();
    }

    private void ShowStep(Step step)
    {
        _step = step;
        _langPanel.Visible = step == Step.Language;
        _licensePanel.Visible = step == Step.License;
        _configPanel.Visible = step == Step.Configure;
        _testPanel.Visible = step == Step.Test;
        _status.Text = "";
        RefreshStepChrome();
        UpdateButtons();
    }

    private void RefreshStepChrome()
    {
        (_stepTitle.Text, _stepHint.Text) = _step switch
        {
            Step.Language => (T("langTitle"), T("langHint")),
            Step.License => (T("eulaTitle"), T("eulaHint")),
            Step.Configure => (T("configTitle"), T("configHint")),
            Step.Test => (T("testTitle"), T("testHint")),
            _ => ("", "")
        };
    }

    private void UpdateButtons()
    {
        _backBtn.Text = T("back");
        _backBtn.Visible = _step != Step.Language;
        _backBtn.Enabled = _step != Step.Language && !_testProgress.Visible;

        _nextBtn.Text = _step switch
        {
            Step.Configure => T("testConnection"),
            Step.Test => T("saveStart"),
            _ => T("next")
        };
        _nextBtn.Enabled = _step switch
        {
            Step.License => _acceptLicense.Checked,
            Step.Test => _preview is not null && !_testProgress.Visible,
            _ => !_testProgress.Visible
        };
    }

    private void GoBack()
    {
        if (_step == Step.Test)
        {
            _preview = null;
            ShowStep(Step.Configure);
            return;
        }
        ShowStep(_step switch
        {
            Step.License => Step.Language,
            Step.Configure => Step.License,
            _ => Step.Language
        });
    }

    private async Task GoNextAsync()
    {
        if (_step == Step.Language)
        {
            if (_rbFr.Checked) _lang = "fr";
            else if (_rbEs.Checked) _lang = "es";
            else _lang = "en";
            ApplyLanguage();
            ShowStep(Step.License);
            return;
        }

        if (_step == Step.License)
        {
            if (!_acceptLicense.Checked)
            {
                _status.Text = T("mustAccept");
                return;
            }
            ShowStep(Step.Configure);
            return;
        }

        if (_step == Step.Configure)
        {
            if (!TryReadConfig(out var apiUrl, out var token, out var family))
                return;
            _pendingApiUrl = apiUrl;
            _pendingToken = token;
            _pendingFamily = family;
            ShowStep(Step.Test);
            await RunConnectivityTestAsync();
            return;
        }

        if (_step == Step.Test)
            await OnSubmitAsync();
    }

    private bool TryReadConfig(out string apiUrl, out string token, out string family)
    {
        apiUrl = "";
        token = (_token.Text ?? "").Trim();
        family = _family.SelectedIndex == 1 ? "serveurs" : "ordinateurs";
        _status.ForeColor = Color.FromArgb(180, 40, 40);

        var host = (_host.Text ?? "").Trim();
        if (string.IsNullOrWhiteSpace(host))
        {
            _status.Text = T("errHostRequired");
            _host.Focus();
            return false;
        }

        // Allow pasting a full URL into the host field
        if (host.Contains("://", StringComparison.Ordinal) &&
            Uri.TryCreate(host, UriKind.Absolute, out var pasted) &&
            (pasted.Scheme == Uri.UriSchemeHttp || pasted.Scheme == Uri.UriSchemeHttps))
        {
            ApplyGuessedServer(pasted.ToString());
            host = (_host.Text ?? "").Trim();
        }

        host = host
            .Replace("https://", "", StringComparison.OrdinalIgnoreCase)
            .Replace("http://", "", StringComparison.OrdinalIgnoreCase)
            .Trim()
            .TrimEnd('/');
        // Strip accidental path/port from host
        var slash = host.IndexOf('/');
        if (slash >= 0) host = host[..slash];
        var colon = host.LastIndexOf(':');
        if (colon > 0 && host.Count(c => c == ':') == 1 && int.TryParse(host[(colon + 1)..], out var embeddedPort))
        {
            host = host[..colon];
            _port.Value = Math.Clamp(embeddedPort, 1, 65535);
        }

        if (string.IsNullOrWhiteSpace(host))
        {
            _status.Text = T("errHostRequired");
            _host.Focus();
            return false;
        }

        var scheme = _scheme.SelectedItem?.ToString() ?? "http";
        var port = (int)_port.Value;
        apiUrl = $"{scheme}://{host}:{port}/api";

        if (!Uri.TryCreate(apiUrl, UriKind.Absolute, out _))
        {
            _status.Text = T("errUrlInvalid");
            _host.Focus();
            return false;
        }
        if (string.IsNullOrWhiteSpace(token) || token.Length < 8)
        {
            _status.Text = T("errTokenRequired");
            _token.Focus();
            return false;
        }

        RefreshUrlPreview();
        return true;
    }

    private void RefreshUrlPreview()
    {
        var host = (_host.Text ?? "").Trim();
        if (string.IsNullOrWhiteSpace(host) || host.Contains("://", StringComparison.Ordinal))
        {
            _urlPreview.Text = string.Format(T("urlPreviewFmt"), $"{_scheme.SelectedItem}://…:{_port.Value}/api");
            return;
        }
        var clean = host
            .Replace("https://", "", StringComparison.OrdinalIgnoreCase)
            .Replace("http://", "", StringComparison.OrdinalIgnoreCase)
            .Split('/')[0]
            .Trim();
        var colon = clean.LastIndexOf(':');
        if (colon > 0 && clean.Count(c => c == ':') == 1)
            clean = clean[..colon];
        _urlPreview.Text = string.Format(T("urlPreviewFmt"), $"{_scheme.SelectedItem}://{clean}:{_port.Value}/api");
    }

    private void ApplyGuessedServer(string? raw)
    {
        _scheme.SelectedIndex = 0;
        _port.Value = DefaultApiPort;
        _host.Text = "";
        if (string.IsNullOrWhiteSpace(raw)) return;

        var value = raw.Trim();
        if (!value.Contains("://", StringComparison.Ordinal))
            value = "http://" + value;
        if (!Uri.TryCreate(value, UriKind.Absolute, out var uri))
        {
            _host.Text = raw.Trim();
            return;
        }

        _scheme.SelectedIndex = uri.Scheme.Equals("https", StringComparison.OrdinalIgnoreCase) ? 1 : 0;
        _host.Text = uri.Host;
        var port = uri.IsDefaultPort
            ? (uri.Scheme.Equals("https", StringComparison.OrdinalIgnoreCase) ? 443 : DefaultApiPort)
            : uri.Port;
        // If URL was http://host/api without explicit port, prefer Veritas API default
        if (uri.IsDefaultPort && uri.Scheme.Equals("http", StringComparison.OrdinalIgnoreCase))
            port = DefaultApiPort;
        _port.Value = Math.Clamp(port, 1, 65535);
    }

    private async Task RunConnectivityTestAsync()
    {
        _preview = null;
        _testProgress.Visible = true;
        _testStatus.Text = T("testing");
        _testStatus.ForeColor = Color.FromArgb(37, 99, 235);
        _testDetails.Text = "";
        UpdateButtons();

        try
        {
            var preview = await AgentApiClient.PreviewEnrollmentStaticAsync(
                _pendingApiUrl, _pendingToken, CancellationToken.None);
            _preview = preview;
            _testProgress.Visible = false;
            _testStatus.Text = T("testOk");
            _testStatus.ForeColor = Color.FromArgb(22, 163, 74);
            RenderPreview(preview);
        }
        catch (Exception ex)
        {
            _preview = null;
            _testProgress.Visible = false;
            _testStatus.Text = T("testFail");
            _testStatus.ForeColor = Color.FromArgb(185, 28, 28);
            _testDetails.Text = ex.Message;
            _status.ForeColor = Color.FromArgb(180, 40, 40);
            _status.Text = T("testFailHint");
        }

        UpdateButtons();
    }

    private void RenderPreview(EnrollPreviewResponse p)
    {
        var uses = p.MaxUses is null
            ? T("usesUnlimited")
            : string.Format(T("usesRemainingFmt"), p.UsesRemaining ?? 0, p.MaxUses.Value);

        _testDetails.Text = string.Join(Environment.NewLine, new[]
        {
            $"{T("labelCompany")}:  {p.ClientName ?? "—"}",
            $"{T("labelToken")}:  {p.TokenLabel ?? "—"}",
            $"{T("labelDevices")}:  {p.DevicesTotal}  ({T("labelWorkstations")}: {p.WorkstationsTotal} · {T("labelServers")}: {p.ServersTotal})",
            $"{T("labelAgents")}:  {p.AgentsActive} {T("labelActive")} / {p.AgentsTotal} {T("labelTotal")}",
            $"{T("labelTokenUses")}:  {uses}"
        });
    }

    private async Task OnSubmitAsync()
    {
        if (_preview is null) return;
        try
        {
            _nextBtn.Enabled = false;
            _status.ForeColor = Color.FromArgb(30, 120, 60);
            _status.Text = T("saving");
            await Task.Yield();

            ConfigStore.WriteBootstrap(_pendingApiUrl, _pendingToken, _pendingFamily);

            _status.Text = T("startingService");
            RestartAgentService();

            ExitCode = 0;
            MessageBox.Show(T("successBody"), T("successTitle"), MessageBoxButtons.OK, MessageBoxIcon.Information);
            Close();
        }
        catch (Exception ex)
        {
            _status.ForeColor = Color.FromArgb(180, 40, 40);
            _status.Text = ex.Message;
            _nextBtn.Enabled = true;
            MessageBox.Show(ex.Message, T("failTitle"), MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }

    private static string TryGuessApiUrl()
    {
        try
        {
            if (File.Exists(AgentConstants.BootstrapPath))
            {
                var json = File.ReadAllText(AgentConstants.BootstrapPath);
                var match = System.Text.RegularExpressions.Regex.Match(json, "\"apiUrl\"\\s*:\\s*\"([^\"]+)\"");
                if (match.Success) return match.Groups[1].Value;
            }
        }
        catch { /* ignore */ }
        return "";
    }

    private static void RestartAgentService()
    {
        try
        {
            using var sc = new ServiceController(AgentConstants.ServiceName);
            if (sc.Status is ServiceControllerStatus.Running or ServiceControllerStatus.StartPending
                or ServiceControllerStatus.ContinuePending)
            {
                try
                {
                    sc.Stop();
                    sc.WaitForStatus(ServiceControllerStatus.Stopped, TimeSpan.FromSeconds(45));
                }
                catch
                {
                    // fall through to start attempt
                }
            }
            sc.Refresh();
            if (sc.Status != ServiceControllerStatus.Running)
            {
                sc.Start();
                sc.WaitForStatus(ServiceControllerStatus.Running, TimeSpan.FromSeconds(45));
            }
        }
        catch (Exception ex)
        {
            var stop = new ProcessStartInfo
            {
                FileName = "sc.exe",
                Arguments = $"stop {AgentConstants.ServiceName}",
                UseShellExecute = false,
                CreateNoWindow = true
            };
            using (var p1 = Process.Start(stop)) p1?.WaitForExit(20_000);
            var start = new ProcessStartInfo
            {
                FileName = "sc.exe",
                Arguments = $"start {AgentConstants.ServiceName}",
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true
            };
            using var p2 = Process.Start(start);
            p2?.WaitForExit(20_000);
            if (p2 is null || p2.ExitCode != 0)
                throw new InvalidOperationException("Could not restart VeritasAgent service. " + ex.Message);
        }
    }

    private static class Strings
    {
        private static readonly Dictionary<string, Dictionary<string, string>> Map = new()
        {
            ["fr"] = new()
            {
                ["windowTitle"] = "Veritas Agent — Configuration",
                ["langTitle"] = "Langue",
                ["langHint"] = "Choisissez la langue de l'assistant d'installation.",
                ["eulaTitle"] = "Conditions d'utilisation",
                ["eulaHint"] = "Lisez et acceptez les conditions avant de continuer.",
                ["configTitle"] = "Configuration de l'agent",
                ["configHint"] = "Adresse du serveur API Veritas (pas le frontend). Port par défaut : 3001.",
                ["testTitle"] = "Test de connectivité",
                ["testHint"] = "Vérification de la liaison avec le serveur et du token.",
                ["back"] = "Retour",
                ["next"] = "Suivant",
                ["testConnection"] = "Tester",
                ["saveStart"] = "Installer",
                ["acceptEula"] = "J'accepte les conditions d'utilisation",
                ["mustAccept"] = "Acceptez les conditions pour continuer.",
                ["scheme"] = "Protocole",
                ["serverHost"] = "Adresse du serveur",
                ["serverPort"] = "Port",
                ["hostPlaceholder"] = "ex. 192.168.1.10 ou veritas.entreprise.local",
                ["urlPreviewFmt"] = "URL API : {0}",
                ["token"] = "Token d'enrôlement",
                ["tokenPlaceholder"] = "Coller le token (Administration → RMM → Tokens)",
                ["equipmentType"] = "Type d'équipement",
                ["familyWorkstation"] = "Poste de travail (ordinateurs)",
                ["familyServer"] = "Serveur (serveurs)",
                ["errHostRequired"] = "L'adresse du serveur est obligatoire.",
                ["errUrlInvalid"] = "Adresse ou port invalide.",
                ["errTokenRequired"] = "Le token d'enrôlement est obligatoire.",
                ["testing"] = "Connexion au serveur…",
                ["testOk"] = "Connexion réussie",
                ["testFail"] = "Échec de la connexion",
                ["testFailHint"] = "Corrigez l'URL ou le token, puis réessayez.",
                ["labelCompany"] = "Entreprise",
                ["labelToken"] = "Libellé du token",
                ["labelDevices"] = "Périphériques",
                ["labelWorkstations"] = "postes",
                ["labelServers"] = "serveurs",
                ["labelAgents"] = "Agents RMM",
                ["labelActive"] = "actifs",
                ["labelTotal"] = "au total",
                ["labelTokenUses"] = "Utilisations du token",
                ["usesUnlimited"] = "illimitées",
                ["usesRemainingFmt"] = "{0} restantes sur {1}",
                ["saving"] = "Enregistrement…",
                ["startingService"] = "Démarrage du service…",
                ["successTitle"] = "Veritas Agent",
                ["successBody"] =
                    "Veritas Agent est configuré et le service Windows a démarré.\n\n" +
                    "Dossier : C:\\Program Files\\Veritas\\Agent\\\n" +
                    "Service : VeritasAgent\n" +
                    "Journaux : %ProgramData%\\Veritas\\Agent\\logs",
                ["failTitle"] = "Échec de la configuration"
            },
            ["en"] = new()
            {
                ["windowTitle"] = "Veritas Agent — Setup",
                ["langTitle"] = "Language",
                ["langHint"] = "Choose the language for this setup wizard.",
                ["eulaTitle"] = "Terms of use",
                ["eulaHint"] = "Please read and accept the terms before continuing.",
                ["configTitle"] = "Agent configuration",
                ["configHint"] = "Veritas API server address (not the frontend). Default port: 3001.",
                ["testTitle"] = "Connectivity test",
                ["testHint"] = "Verifying the link to your server and enrollment token.",
                ["back"] = "Back",
                ["next"] = "Next",
                ["testConnection"] = "Test",
                ["saveStart"] = "Install",
                ["acceptEula"] = "I accept the terms of use",
                ["mustAccept"] = "You must accept the terms to continue.",
                ["scheme"] = "Protocol",
                ["serverHost"] = "Server address",
                ["serverPort"] = "Port",
                ["hostPlaceholder"] = "e.g. 192.168.1.10 or veritas.company.local",
                ["urlPreviewFmt"] = "API URL: {0}",
                ["token"] = "Enrollment token",
                ["tokenPlaceholder"] = "Paste token from Administration → RMM → Tokens",
                ["equipmentType"] = "Equipment type",
                ["familyWorkstation"] = "Workstation (ordinateurs)",
                ["familyServer"] = "Server (serveurs)",
                ["errHostRequired"] = "Server address is required.",
                ["errUrlInvalid"] = "Invalid address or port.",
                ["errTokenRequired"] = "Enrollment token is required.",
                ["testing"] = "Connecting to server…",
                ["testOk"] = "Connection successful",
                ["testFail"] = "Connection failed",
                ["testFailHint"] = "Fix the URL or token, then try again.",
                ["labelCompany"] = "Company",
                ["labelToken"] = "Token label",
                ["labelDevices"] = "Devices",
                ["labelWorkstations"] = "workstations",
                ["labelServers"] = "servers",
                ["labelAgents"] = "RMM agents",
                ["labelActive"] = "active",
                ["labelTotal"] = "total",
                ["labelTokenUses"] = "Token uses",
                ["usesUnlimited"] = "unlimited",
                ["usesRemainingFmt"] = "{0} remaining of {1}",
                ["saving"] = "Saving…",
                ["startingService"] = "Starting service…",
                ["successTitle"] = "Veritas Agent",
                ["successBody"] =
                    "Veritas Agent is configured and the Windows service has been started.\n\n" +
                    "Install folder: C:\\Program Files\\Veritas\\Agent\\\n" +
                    "Service name: VeritasAgent\n" +
                    "Logs: %ProgramData%\\Veritas\\Agent\\logs",
                ["failTitle"] = "Setup failed"
            },
            ["es"] = new()
            {
                ["windowTitle"] = "Veritas Agent — Configuración",
                ["langTitle"] = "Idioma",
                ["langHint"] = "Elija el idioma del asistente de instalación.",
                ["eulaTitle"] = "Condiciones de uso",
                ["eulaHint"] = "Lea y acepte las condiciones antes de continuar.",
                ["configTitle"] = "Configuración del agente",
                ["configHint"] = "Dirección del servidor API Veritas (no el frontend). Puerto por defecto: 3001.",
                ["testTitle"] = "Prueba de conectividad",
                ["testHint"] = "Comprobando la conexión con el servidor y el token.",
                ["back"] = "Atrás",
                ["next"] = "Siguiente",
                ["testConnection"] = "Probar",
                ["saveStart"] = "Instalar",
                ["acceptEula"] = "Acepto las condiciones de uso",
                ["mustAccept"] = "Debe aceptar las condiciones para continuar.",
                ["scheme"] = "Protocolo",
                ["serverHost"] = "Dirección del servidor",
                ["serverPort"] = "Puerto",
                ["hostPlaceholder"] = "ej. 192.168.1.10 o veritas.empresa.local",
                ["urlPreviewFmt"] = "URL API: {0}",
                ["token"] = "Token de inscripción",
                ["tokenPlaceholder"] = "Pegue el token (Administración → RMM → Tokens)",
                ["equipmentType"] = "Tipo de equipo",
                ["familyWorkstation"] = "Estación de trabajo (ordinateurs)",
                ["familyServer"] = "Servidor (serveurs)",
                ["errHostRequired"] = "La dirección del servidor es obligatoria.",
                ["errUrlInvalid"] = "Dirección o puerto no válido.",
                ["errTokenRequired"] = "El token de inscripción es obligatorio.",
                ["testing"] = "Conectando con el servidor…",
                ["testOk"] = "Conexión correcta",
                ["testFail"] = "Error de conexión",
                ["testFailHint"] = "Corrija la URL o el token e inténtelo de nuevo.",
                ["labelCompany"] = "Empresa",
                ["labelToken"] = "Etiqueta del token",
                ["labelDevices"] = "Dispositivos",
                ["labelWorkstations"] = "puestos",
                ["labelServers"] = "servidores",
                ["labelAgents"] = "Agentes RMM",
                ["labelActive"] = "activos",
                ["labelTotal"] = "en total",
                ["labelTokenUses"] = "Usos del token",
                ["usesUnlimited"] = "ilimitados",
                ["usesRemainingFmt"] = "{0} restantes de {1}",
                ["saving"] = "Guardando…",
                ["startingService"] = "Iniciando el servicio…",
                ["successTitle"] = "Veritas Agent",
                ["successBody"] =
                    "Veritas Agent está configurado y el servicio de Windows se ha iniciado.\n\n" +
                    "Carpeta: C:\\Program Files\\Veritas\\Agent\\\n" +
                    "Servicio: VeritasAgent\n" +
                    "Registros: %ProgramData%\\Veritas\\Agent\\logs",
                ["failTitle"] = "Error de configuración"
            }
        };

        private static readonly Dictionary<string, string> Eulas = new()
        {
            ["fr"] =
                "CONDITIONS D'UTILISATION — VERITAS AGENT" + Environment.NewLine +
                Environment.NewLine +
                "En installant et en configurant Veritas Agent, vous acceptez que :" + Environment.NewLine +
                Environment.NewLine +
                "1. Service Windows" + Environment.NewLine +
                "   L'agent s'exécute en tant que service Windows (compte LocalSystem) sur cet appareil." + Environment.NewLine +
                Environment.NewLine +
                "2. Collecte d'inventaire" + Environment.NewLine +
                "   Il collecte des informations (matériel, système, logiciels, réseau) et les envoie" + Environment.NewLine +
                "   périodiquement au serveur Veritas que vous indiquez." + Environment.NewLine +
                Environment.NewLine +
                "3. Stockage des secrets" + Environment.NewLine +
                "   Les secrets d'authentification sont stockés de façon protégée (DPAPI / Machine)" + Environment.NewLine +
                "   sous %ProgramData%\\Veritas\\Agent." + Environment.NewLine +
                Environment.NewLine +
                "4. Responsabilité" + Environment.NewLine +
                "   Vous êtes responsable de la légitimité de l'installation sur cet équipement" + Environment.NewLine +
                "   et du token d'enrôlement utilisé." + Environment.NewLine +
                Environment.NewLine +
                "5. Mises à jour" + Environment.NewLine +
                "   Veritas Agent peut se mettre à jour automatiquement lorsque le serveur" + Environment.NewLine +
                "   propose une nouvelle version du MSI." + Environment.NewLine +
                Environment.NewLine +
                "Désinstallation : Paramètres Windows → Applications → Veritas Agent," + Environment.NewLine +
                "ou msiexec /x sur le MSI d'origine." + Environment.NewLine +
                Environment.NewLine +
                "Pour toute question, contactez votre administrateur Veritas.",

            ["en"] =
                "TERMS OF USE — VERITAS AGENT" + Environment.NewLine +
                Environment.NewLine +
                "By installing and configuring Veritas Agent, you agree that:" + Environment.NewLine +
                Environment.NewLine +
                "1. Windows service" + Environment.NewLine +
                "   The agent runs as a Windows service (LocalSystem account) on this device." + Environment.NewLine +
                Environment.NewLine +
                "2. Inventory collection" + Environment.NewLine +
                "   It collects information (hardware, system, software, network) and periodically" + Environment.NewLine +
                "   sends it to the Veritas server you specify." + Environment.NewLine +
                Environment.NewLine +
                "3. Secret storage" + Environment.NewLine +
                "   Authentication secrets are stored protected (DPAPI / LocalMachine)" + Environment.NewLine +
                "   under %ProgramData%\\Veritas\\Agent." + Environment.NewLine +
                Environment.NewLine +
                "4. Responsibility" + Environment.NewLine +
                "   You are responsible for authorizing this installation and for the" + Environment.NewLine +
                "   enrollment token used." + Environment.NewLine +
                Environment.NewLine +
                "5. Updates" + Environment.NewLine +
                "   Veritas Agent may auto-update when the server offers a newer MSI." + Environment.NewLine +
                Environment.NewLine +
                "Uninstall: Windows Settings → Apps → Veritas Agent," + Environment.NewLine +
                "or msiexec /x on the original MSI." + Environment.NewLine +
                Environment.NewLine +
                "For questions, contact your Veritas administrator.",

            ["es"] =
                "CONDICIONES DE USO — VERITAS AGENT" + Environment.NewLine +
                Environment.NewLine +
                "Al instalar y configurar Veritas Agent, usted acepta que:" + Environment.NewLine +
                Environment.NewLine +
                "1. Servicio de Windows" + Environment.NewLine +
                "   El agente se ejecuta como servicio de Windows (cuenta LocalSystem) en este dispositivo." + Environment.NewLine +
                Environment.NewLine +
                "2. Recopilación de inventario" + Environment.NewLine +
                "   Recopila información (hardware, sistema, software, red) y la envía" + Environment.NewLine +
                "   periódicamente al servidor Veritas que usted indique." + Environment.NewLine +
                Environment.NewLine +
                "3. Almacenamiento de secretos" + Environment.NewLine +
                "   Los secretos de autenticación se almacenan de forma protegida (DPAPI / Machine)" + Environment.NewLine +
                "   en %ProgramData%\\Veritas\\Agent." + Environment.NewLine +
                Environment.NewLine +
                "4. Responsabilidad" + Environment.NewLine +
                "   Usted es responsable de la legitimidad de la instalación en este equipo" + Environment.NewLine +
                "   y del token de inscripción utilizado." + Environment.NewLine +
                Environment.NewLine +
                "5. Actualizaciones" + Environment.NewLine +
                "   Veritas Agent puede actualizarse automáticamente cuando el servidor" + Environment.NewLine +
                "   ofrezca una nueva versión del MSI." + Environment.NewLine +
                Environment.NewLine +
                "Desinstalación: Configuración de Windows → Aplicaciones → Veritas Agent," + Environment.NewLine +
                "o msiexec /x sobre el MSI original." + Environment.NewLine +
                Environment.NewLine +
                "Para cualquier consulta, contacte a su administrador Veritas."
        };

        public static string Get(string lang, string key)
        {
            if (Map.TryGetValue(lang, out var dict) && dict.TryGetValue(key, out var value))
                return value;
            if (Map["en"].TryGetValue(key, out var fallback))
                return fallback;
            return key;
        }

        public static string GetEula(string lang) =>
            Eulas.TryGetValue(lang, out var eula) ? eula : Eulas["en"];
    }
}
