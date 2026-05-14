import { DynamicTool } from '@langchain/core/tools';
import { logger } from '../../utils/logger';


export const confirmTransferTool = new DynamicTool({
    name: 'confirm_transfer',
    description: 'Confirm a money transfer. Use this when user wants to transfer money to someone. Input should be JSON: {"to": "account_name", "amount": 100, "currency": "HKD"}',
    func: async (input: string) => {
        logger.info(`[Transfer] Confirming transfer with: ${input}`);
        
        try {
            const { to, amount, currency = 'HKD' } = JSON.parse(input);
            // mock transfer processing
            await new Promise(resolve => setTimeout(resolve, 500));
            return `✓ Transfer confirmed: ${amount} ${currency} sent to ${to}. Transaction ID: ${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
        } catch (error) {
            return `Transfer failed: ${error}`;
        }
    }
});

export const confirmRiskAcknowledgmentTool = new DynamicTool({
    name: 'confirm_risk_acknowledgment',
    description: `Confirm that user acknowledges the risks of a high-risk investment. 
Use this when user wants to invest in high-risk products (e.g., crypto, derivatives, margin trading).
Input should be JSON: {"product": "product_name", "risk_level": "high/very_high", "amount": 1000}`,
    func: async (input: string) => {
        logger.info(`[Risk] Confirming risk acknowledgment with: ${input}`);
        
        try {
            const { product, risk_level, amount } = JSON.parse(input);
            await new Promise(resolve => setTimeout(resolve, 300));
            return `✓ Risk acknowledged. Investment confirmed: ${amount} into ${product} (Risk: ${risk_level}).\n\nDisclaimer: High-risk investments may result in total loss of capital.`;
        } catch (error) {
            return `Risk confirmation failed: ${error}`;
        }
    }
});

export const confirmIdentityChangeTool = new DynamicTool({
    name: 'confirm_identity_change',
    description: `Confirm changes to sensitive account information. 
Use this when user wants to change personal details like phone number, email, address, or password.
Input should be JSON: {"field": "phone/email/address/password", "old_value": "xxx", "new_value": "yyy"}`,
    func: async (input: string) => {
        logger.info(`[Identity] Confirming identity change with: ${input}`);
        
        try {
            const { field, old_value, new_value } = JSON.parse(input);
            await new Promise(resolve => setTimeout(resolve, 500));
            return `✓ Identity change confirmed. ${field} updated from "${old_value}" to "${new_value}".\n\nNote: Changes will take effect immediately. Please verify with customer service if this was unauthorized.`;
        } catch (error) {
            return `Identity change failed: ${error}`;
        }
    }
});