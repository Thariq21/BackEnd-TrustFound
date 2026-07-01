export const baseEmailTemplate = (title, messageText, imageUrl = null) => {
    const imageHtml = imageUrl
        ? `<div style="text-align: center; margin-bottom: 20px;">
               <img src="${imageUrl}" alt="Item Image" style="max-width: 100%; width: 455px; height: auto; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);" />
           </div>`
        : '';

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
            .header { background-color: #0B1C3E; color: #ffffff; text-align: center; padding: 25px 20px; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 600; letter-spacing: 1px; }
            .content { padding: 30px; color: #333333; line-height: 1.6; font-size: 16px; }
            .footer { background-color: #f8f9fa; color: #777777; text-align: center; padding: 20px; font-size: 12px; border-top: 1px solid #eeeeee; }
            .button { display: inline-block; padding: 12px 24px; background-color: #0B1C3E; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 20px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>${title}</h1>
            </div>
            <div class="content">
                ${imageHtml}
                <p style="white-space: pre-wrap;">${messageText}</p>
            </div>
            <div class="footer">
                <p>TrustFound - Lost & Found Universitas Bakrie</p>
                <p>This is an automated message, please do not reply to this email.</p>
            </div>
        </div>
    </body>
    </html>
    `;
};

export default {
    baseEmailTemplate
};
