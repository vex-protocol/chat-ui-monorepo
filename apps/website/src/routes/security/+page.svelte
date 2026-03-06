<script>
	import { Meta } from '$lib/seo';
</script>

<Meta
	title="Security"
	description="How Vex encrypts your messages. X3DH key exchange, device-bound identity, NaCl cryptography. The server stores only ciphertext — it cannot read your messages."
	path="/security"
/>

<div class="security">
	<section id="security-hero" class="hero">
		<h1>Security</h1>
		<p class="subtitle">
			Every message is encrypted on your device before it leaves. The server stores only
			ciphertext. It cannot read your messages, cannot impersonate you, and cannot forge device
			signatures.
		</p>
	</section>

	<section id="security-model" class="section">
		<h2>The Threat Model</h2>
		<p>
			Vex assumes the server is hostile. Even if someone gains full access to the server — database,
			memory, logs — they see only encrypted blobs. No plaintext. No keys. No metadata beyond what's
			needed to deliver messages.
		</p>

		<h3>What the server knows</h3>
		<ul>
			<li>Your username and device public keys (needed for key exchange)</li>
			<li>Who sent a message to which device (delivery routing)</li>
			<li>Timestamps of message delivery</li>
			<li>Server and channel membership</li>
		</ul>

		<h3>What the server cannot know</h3>
		<ul>
			<li>Message content — encrypted before leaving your device</li>
			<li>Your private keys — generated on-device, never transmitted</li>
			<li>Session keys — derived client-side via Diffie-Hellman</li>
			<li>Message content in transit — E2E encrypted, not just TLS</li>
		</ul>

		<h2>How Encryption Works</h2>

		<h3>Your identity is a key pair</h3>
		<p>
			When you register, your device generates an <strong>Ed25519 signing key pair</strong>. The
			private key never leaves your device. The public key becomes your identity — the server and
			other users verify you by your key, not your username.
		</p>

		<h3>Key hierarchy</h3>
		<div class="diagram">
			<pre>
User
└── Device (Ed25519 key pair — private key never leaves client)
    ├── signKey       — long-term identity key
    ├── preKey        — medium-term key, signed by signKey
    └── oneTimeKeys   — single-use, consumed during key exchange</pre>
		</div>
		<p>
			Each device has its own key pair. Messages are encrypted <em>per-device</em>, not per-user.
			If you have two devices, each receives its own encrypted copy.
		</p>

		<h3>X3DH key exchange</h3>
		<p>
			When you message someone for the first time, Vex uses an
			<strong>Extended Triple Diffie-Hellman (X3DH)</strong> handshake — the same approach used by
			Signal.
		</p>
		<ol>
			<li>Your device fetches the recipient's <strong>key bundle</strong> from the server: their signing key, pre-key, and a one-time key.</li>
			<li>Your device derives a <strong>shared secret</strong> from these keys using Diffie-Hellman.</li>
			<li>The message is encrypted with the shared secret using <strong>NaCl secretbox</strong> (XSalsa20-Poly1305).</li>
			<li>The one-time key is consumed — it can never be reused, providing forward secrecy for the initial message.</li>
			<li>Subsequent messages use a <strong>ratcheted session</strong> — each message derives a new key.</li>
		</ol>

		<h3>What gets stored on the server</h3>
		<div class="diagram">
			<pre>
Mail record (server-side):
  nonce:     24-byte random value
  cipher:    encrypted message (ciphertext)
  header:    encrypted session header
  recipient: device ID (for routing)
  sender:    device ID (for routing)
  time:      delivery timestamp</pre>
		</div>
		<p>
			The server sees <code>cipher</code> — an opaque blob. It routes the message to the recipient
			device and deletes it after delivery. At no point can the server decrypt the content.
		</p>

		<h3>Server signing key</h3>
		<p>
			The server has its own Ed25519 signing key (SPK). Clients use the server's public key to
			verify that key bundles and action tokens actually came from the server — preventing
			man-in-the-middle attacks on key exchange.
		</p>
	</section>

	<section id="security-comparison" class="section">
		<h2>How This Compares</h2>

		<div class="comparison">
			<table>
				<thead>
					<tr>
						<th></th>
						<th>Vex</th>
						<th>Typical chat platforms</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>Encryption</td>
						<td>E2E by default, all messages</td>
						<td>TLS only (server reads plaintext), or opt-in E2E</td>
					</tr>
					<tr>
						<td>Identity</td>
						<td>Device key pair (Ed25519)</td>
						<td>Email/phone number</td>
					</tr>
					<tr>
						<td>Server access</td>
						<td>Ciphertext only</td>
						<td>Full plaintext access</td>
					</tr>
					<tr>
						<td>Self-hostable</td>
						<td>Yes (AGPL, single binary)</td>
						<td>Rarely, or proprietary</td>
					</tr>
					<tr>
						<td>Analytics</td>
						<td>None. Zero tracking.</td>
						<td>Behavioral profiling, ad targeting</td>
					</tr>
					<tr>
						<td>Source code</td>
						<td>Fully open (AGPL-3.0)</td>
						<td>Closed or partially open</td>
					</tr>
				</tbody>
			</table>
		</div>

		<h3>Self-hosting matters</h3>
		<p>
			Even with end-to-end encryption, metadata matters. Who talks to whom, when, how often — this
			is valuable even without message content. When you self-host Vex, you control the metadata too.
			No third party sees your communication patterns.
		</p>

		<h3>Open source matters</h3>
		<p>
			Vex is licensed under <strong>AGPL-3.0</strong>. Anyone running a Vex server must publish
			their modifications. You can audit the server code, the client code, and the cryptographic
			library. Trust is verified, not assumed.
		</p>
	</section>
</div>

<style>
	.security {
		max-width: 720px;
		margin: 0 auto;
		padding: 6rem 1.5rem 4rem;
	}

	.hero {
		min-height: 60vh;
		display: flex;
		flex-direction: column;
		justify-content: center;
	}

	h1 {
		font-size: 2.5rem;
		margin: 0 0 1rem;
	}

	.subtitle {
		font-size: 1.15rem;
		color: var(--text-secondary);
		line-height: 1.7;
		max-width: 600px;
	}

	.section {
		padding: 4rem 0;
	}

	h2 {
		font-size: 1.5rem;
		margin: 3rem 0 1rem;
		color: var(--text-primary);
	}

	h2:first-child {
		margin-top: 0;
	}

	h3 {
		font-size: 1.1rem;
		margin: 2rem 0 0.75rem;
		color: var(--text-primary);
	}

	p {
		color: var(--text-secondary);
		line-height: 1.7;
		margin: 0 0 1rem;
	}

	ul, ol {
		color: var(--text-secondary);
		line-height: 1.7;
		padding-left: 1.5rem;
		margin: 0 0 1.5rem;
	}

	li {
		margin-bottom: 0.4rem;
	}

	code {
		background: var(--bg-tertiary);
		padding: 0.15rem 0.4rem;
		border-radius: 4px;
		font-size: 0.9em;
	}

	.diagram {
		background: var(--bg-secondary);
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 1.25rem;
		margin: 1rem 0 1.5rem;
		overflow-x: auto;
	}

	.diagram pre {
		margin: 0;
		font-size: 0.85rem;
		line-height: 1.5;
		color: var(--text-primary);
	}

	.comparison {
		overflow-x: auto;
		margin: 1rem 0 1.5rem;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.9rem;
	}

	th, td {
		text-align: left;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--border);
	}

	th {
		color: var(--text-primary);
		font-weight: 600;
	}

	td {
		color: var(--text-secondary);
	}

	td:first-child {
		color: var(--text-primary);
		font-weight: 500;
		white-space: nowrap;
	}

	@media (max-width: 768px) {
		.security {
			padding: 5rem 1rem 3rem;
		}

		h1 {
			font-size: 2rem;
		}

		.hero {
			min-height: 50vh;
		}
	}
</style>
