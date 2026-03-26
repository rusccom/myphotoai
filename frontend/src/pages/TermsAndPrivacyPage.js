import React from 'react';
import SEO from '../components/SEO';
import styles from './TermsAndPrivacyPage.module.css';

function TermsAndPrivacyPage() {
    return (
        <div className={styles.container}>
            <SEO 
                title="Terms of Service & Privacy Policy"
                description="Read MyPhotoAI Terms of Service and Privacy Policy. Learn about data protection, user rights, and usage guidelines."
                path="/terms-and-privacy"
                noindex={true}
            />
            <div className={styles.content}>
                {/* Terms of Use Section */}
                <section className={styles.section}>
                    <h1 className={styles.mainTitle}>MyPhotoAI Terms of Use</h1>
                    <p className={styles.effectiveDate}>Effective date: October 10, 2024</p>

                    <div className={styles.article}>
                        <h2>1. Who we are and what the "Service" includes</h2>
                        <p>"MyPhotoAI," together with related websites and applications (including, without limitation, the myphotoai.com domain and any subdomains), provides tools for uploading materials, training personal models, and generating images/videos (the "Service"). By using the Service, you acknowledge that you have read and accept these Terms in full.</p>
                    </div>

                    <div className={styles.article}>
                        <h2>2. Acceptance and changes</h2>
                        <p>We may update the Terms, functionality, or availability of the Service by posting a revised version on the website or sending you a notice by email. The new version applies from the effective date stated in it. By continuing to use the Service after publication of changes, you agree to them.</p>
                    </div>

                    <div className={styles.article}>
                        <h2>3. Registration and access</h2>
                        <p>Each user must maintain a unique account. We may deny access, modify eligibility criteria, or limit functionality without compensation where required by law, security, or our policies.</p>
                    </div>

                    <div className={styles.article}>
                        <h2>4. Permitted use and age restrictions</h2>
                        <p>The Service is for lawful purposes only. You may create models:</p>
                        <ul>
                            <li>of your own likeness, provided you are 18+ (or have reached the age of majority in your country);</li>
                            <li>of other adults, only if you have their explicit written consent to use images/video for training and content generation.</li>
                        </ul>
                        <p>You may not train or generate content involving minors or any person for whom you do not have written consent. Persons under 18/the minimum lawful age in your jurisdiction (whichever is higher) may not use the Service.</p>
                    </div>

                    <div className={styles.article}>
                        <h2>5. Strictly prohibited</h2>
                        <p>You may not, and must not enable others to:</p>
                        <ul>
                            <li>impersonate, mislead, engage in fraud, create/distribute forged documents, or conduct phishing;</li>
                            <li>create pornographic content, "deepfakes" intended to deceive, political campaigning, or content inciting hatred, discrimination, or violence;</li>
                            <li>infringe IP or other rights, disclose personal data without a lawful basis;</li>
                            <li>exploit or depict children in any way;</li>
                            <li>interfere with the Service, perform scraping, reverse engineering, bypass security, or conduct unauthorized data collection;</li>
                            <li>deploy malware, overload infrastructure, or compromise security.</li>
                        </ul>
                        <p>Violations may result in immediate suspension, removal of materials, and—where required—referral to competent authorities.</p>
                    </div>

                    <div className={styles.article}>
                        <h2>6. Rights in created materials ("Assets")</h2>
                        <p>Unless otherwise required by law or by agreements with rightsholders:</p>
                        <ul>
                            <li>You retain rights in Assets you create with the Service.</li>
                            <li>You also grant MyPhotoAI and its affiliates a perpetual, worldwide, royalty-free, non-exclusive, sublicensable, irrevocable license to use your prompts, uploaded materials, and created Assets for: providing and maintaining the Service, improving algorithms and models, ensuring security, complying with law, and demonstrating functionality or promoting the Service.</li>
                        </ul>
                        <p>If you make Assets public, other users may view and use them within the Service's features.</p>
                        <p>You represent that you hold sufficient rights in uploaded materials and that you obtain required written consents from depicted persons (18+).</p>
                    </div>

                    <div className={styles.article}>
                        <h2>7. Payments, credits, and taxes</h2>
                        <p>Access is provided through pre-paid points (credits). You purchase points and spend them on generation and training actions.</p>
                        <p>Given the high cost of computation (GPU), refunds are not provided; you also waive any standard 14-day withdrawal/cooling-off period where applicable in your law. We may change prices and offerings (models, credits, etc.). Taxes and duties, where applicable, are your responsibility.</p>
                    </div>

                    <div className={styles.article}>
                        <h2>8. Termination</h2>
                        <p>Either party may cease using the Service at any time. In case of material breaches, we may suspend access and remove materials. Payments are non-refundable. Provisions that by their nature survive (limitation of liability, licenses, confidentiality, etc.) continue after termination.</p>
                    </div>

                    <div className={styles.article}>
                        <h2>9. MyPhotoAI intellectual property</h2>
                        <p>Trademarks, logos, design, software, databases, and other elements of the Service belong to MyPhotoAI or are licensed to it. Any use beyond these Terms requires prior written permission.</p>
                    </div>

                    <div className={styles.article}>
                        <h2>10. Copyright notices</h2>
                        <p>We respect intellectual property rights and process proper notices of alleged infringement (for example, under procedures comparable to the DMCA where applicable). Repeat infringement may lead to termination of access.</p>
                    </div>

                    <div className={styles.article}>
                        <h2>11. Disclaimer of warranties</h2>
                        <p>The Service is provided "as is" and "as available" without any express or implied warranties, including, without limitation, warranties of merchantability, fitness for a particular purpose, and non-infringement.</p>
                    </div>

                    <div className={styles.article}>
                        <h2>12. Limitation of liability</h2>
                        <p>In no event shall MyPhotoAI, its owners, employees, contractors, or partners be liable for lost profits, data loss, or any indirect, punitive, or consequential damages. Aggregate direct liability is limited to the amounts you paid during the period giving rise to the claim or, if greater, USD 500. Some jurisdictions may not allow certain exclusions/limitations—where so, the maximum legally permitted limits apply.</p>
                    </div>

                    <div className={styles.article}>
                        <h2>13. Dispute resolution (mandatory arbitration) and class-action waiver</h2>
                        <p>All disputes between you and MyPhotoAI arising out of or relating to the Service or these Terms shall be resolved by individual mandatory arbitration before a neutral arbitrator under simplified consumer rules of [specify the arbitral rules and administrator, e.g., AAA/VIAC/LCIA], seated in [specify city/country].</p>
                        <p>You and MyPhotoAI waive the right to a jury trial and to participate in class/representative actions.</p>
                        <p>You may opt out of arbitration within 30 days of first accessing the Service by sending a written notice to the address in "Contacts."</p>
                    </div>

                    <div className={styles.article}>
                        <h2>14. Governing law and venue</h2>
                        <p>If the arbitration clause is inapplicable, these Terms are governed by the laws of [specify jurisdiction, e.g., England and Wales / State of Delaware / Singapore], and disputes shall be heard in the courts of that jurisdiction.</p>
                    </div>

                    <div className={styles.article}>
                        <h2>15. Miscellaneous</h2>
                        <p>If any provision is invalid, the remainder remains in effect. Failure to enforce a right is not a waiver. You may not assign or transfer these Terms without our consent; we may assign them in connection with a reorganization/transaction/within our group.</p>
                    </div>

                    <div className={styles.article}>
                        <h2>16. Contacts</h2>
                        <p>Legal notices and requests: [full legal name of MyPhotoAI, address, and email for claims and notices].</p>
                    </div>
                </section>

                {/* Privacy Policy Section */}
                <section className={styles.section}>
                    <h1 className={styles.mainTitle}>MyPhotoAI Privacy Policy</h1>

                    <div className={styles.article}>
                        <h2>1. Scope</h2>
                        <p>This Policy describes how MyPhotoAI processes personal data (e.g., name, email) and other information when operating its websites, apps, and related services.</p>
                    </div>

                    <div className={styles.article}>
                        <h2>2. Data we collect</h2>
                        <p><strong>Provided by you:</strong> name, email, payment details (processed via payment providers), content (photos/videos/files/prompts), support communications.</p>
                        <p><strong>Collected automatically:</strong> IP address; device/browser identifiers and characteristics; language; settings; referrer; pages and events on the website/app; session duration; UI interaction events; approximate location (where enabled).</p>
                        <p><strong>From external sources:</strong> authentication providers; social networks when integrated; vendors and partners (e.g., geolocation via IP).</p>
                        <p><strong>Derived data (inferences):</strong> our systems may generate insights about preferences/characteristics based on other data.</p>
                    </div>

                    <div className={styles.article}>
                        <h2>3. Purposes of processing</h2>
                        <ul>
                            <li>Providing and supporting the Service (including model training/operation, billing, security).</li>
                            <li>Improving quality and developing features.</li>
                            <li>Communications (service notices, support responses, news—with the ability to opt out).</li>
                            <li>Compliance with law and regulatory requirements.</li>
                        </ul>
                    </div>

                    <div className={styles.article}>
                        <h2>4. Sharing</h2>
                        <ul>
                            <li>Vendors and service providers processing data under contract and following our instructions.</li>
                            <li>Where required by law or to protect rights and safety of users and third parties.</li>
                            <li>In reorganizations/transactions, where data may transfer to a successor.</li>
                        </ul>
                        <p>We may also publish aggregated/de-identified statistics. We do not sell personal data.</p>
                    </div>

                    <div className={styles.article}>
                        <h2>5. International transfers and storage</h2>
                        <p>Information may be processed and stored outside your country. We apply appropriate legal mechanisms for cross-border transfers (where required) and protective measures.</p>
                    </div>

                    <div className={styles.article}>
                        <h2>6. Security and retention</h2>
                        <p>We implement organizational and technical safeguards. Retention depends on processing purposes and legal requirements; once no longer needed, data is deleted or anonymized.</p>
                    </div>

                    <div className={styles.article}>
                        <h2>7. User rights (GDPR/UK GDPR/Swiss, CCPA, etc.)</h2>
                        <p>We recognize the following rights (regardless of location, where not contrary to law):</p>
                        <ul>
                            <li>access and copy;</li>
                            <li>rectification and deletion;</li>
                            <li>portability (where applicable);</li>
                            <li>restriction or objection to processing;</li>
                            <li>freedom from discrimination for exercising rights;</li>
                            <li>opt-out of marketing.</li>
                        </ul>
                        <p>Submit requests to [privacy@myphotoai.com]. We may need to verify identity. If we act as a processor on behalf of a controller, we will direct your request to the controller.</p>
                    </div>

                    <div className={styles.article}>
                        <h2>8. Children</h2>
                        <p>Our services are not intended for individuals under 13. Do not provide information about children. If you believe a child has provided data, contact us and we will delete it.</p>
                    </div>

                    <div className={styles.article}>
                        <h2>9. Cookies and similar technologies</h2>
                        <p>We use cookies/SDK/local storage for authentication, preferences, analytics, and product improvement. You can manage settings in your browser or via our preference tools (where available).</p>
                    </div>

                    <div className={styles.article}>
                        <h2>10. Contact and complaints</h2>
                        <p>Questions and privacy requests: [DPO/contact name, address, email]. Users in the EEA/UK/Switzerland may also complain to their data protection authority.</p>
                    </div>

                    <div className={styles.article}>
                        <h2>11. Updates to this Policy</h2>
                        <p>We will review this Policy periodically and publish a new version with an effective date. Continued use of the Service constitutes acceptance of the updates.</p>
                    </div>
                </section>

                {/* Important Notes */}
                <section className={styles.section}>
                    <h1 className={styles.mainTitle}>Important notes</h1>
                    <div className={styles.article}>
                        <p>Fill in placeholders: arbitral rules and seat, governing law and venue, company details, and contact emails/addresses for notices and privacy.</p>
                        <p>This text is a practical baseline but does not replace legal advice in your jurisdiction. If you like, I can prepare tailored variants (EU/UK with DPA/SCCs; US state-specific) and a Model Release (18+) template.</p>
                    </div>
                </section>
            </div>
        </div>
    );
}

export default TermsAndPrivacyPage;

