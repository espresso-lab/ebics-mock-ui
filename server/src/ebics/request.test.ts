import { describe, expect, it } from 'vitest'
import { parseRequest } from './request.js'

describe('parseRequest BTD DateRange', () => {
  it('extracts the date range from a real banking-service BTD request (urn: prefix, Z-suffixed dates)', () => {
    const xml =
      `<urn:ebicsRequest xmlns:urn="urn:org:ebics:H005" Version="H005" Revision="1">` +
      `<urn:header authenticate="true"><urn:static><urn:HostID>MOCKBANK</urn:HostID>` +
      `<urn:PartnerID>MV1</urn:PartnerID><urn:UserID>U1</urn:UserID>` +
      `<urn:OrderDetails><urn:AdminOrderType>BTD</urn:AdminOrderType><urn:BTDOrderParams>` +
      `<urn:Service><urn:ServiceName>EOP</urn:ServiceName><urn:Scope>DE</urn:Scope>` +
      `<urn:Container containerType="ZIP"></urn:Container><urn:MsgName>camt.053</urn:MsgName></urn:Service>` +
      `<urn:DateRange><urn:Start>2025-01-01Z</urn:Start><urn:End>2025-12-31Z</urn:End></urn:DateRange>` +
      `</urn:BTDOrderParams></urn:OrderDetails></urn:static>` +
      `<urn:mutable><urn:TransactionPhase>Initialisation</urn:TransactionPhase></urn:mutable></urn:header><urn:body/></urn:ebicsRequest>`

    const parsed = parseRequest(xml)

    expect(parsed.orderType).toBe('BTD')
    expect(parsed.btf?.serviceName).toBe('EOP')
    expect(parsed.dateStart).toBe('2025-01-01')
    expect(parsed.dateEnd).toBe('2025-12-31')
  })

  it('leaves the date range undefined for an undated BTD request', () => {
    const xml =
      `<ebicsRequest xmlns="urn:org:ebics:H005" Version="H005" Revision="1">` +
      `<header authenticate="true"><static><HostID>MOCKBANK</HostID><PartnerID>MV1</PartnerID><UserID>U1</UserID>` +
      `<OrderDetails><AdminOrderType>BTD</AdminOrderType><BTDOrderParams><Service><ServiceName>EOP</ServiceName>` +
      `<MsgName>camt.053</MsgName></Service></BTDOrderParams></OrderDetails></static>` +
      `<mutable><TransactionPhase>Initialisation</TransactionPhase></mutable></header><body/></ebicsRequest>`

    const parsed = parseRequest(xml)

    expect(parsed.dateStart).toBeUndefined()
    expect(parsed.dateEnd).toBeUndefined()
  })
})
