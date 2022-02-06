import React, { useState, useEffect, useContext } from 'react';
// import { Link } from "react-router-dom";
import { Button, Input, InputNumber } from "antd";
// import { OfferContractContext } from "context/context";
import { useOffer } from "hooks/useOffer";
// import { useIPFS } from "hooks/useIPFS";
import { useMoralis, useMoralisQuery } from "react-moralis";


/** ... NOT SURE ABOUT THIS...
 * Order Review Page
 */
function OrderReview(props) {
    const { token_id, order_id } = props.match.params;
    const { Moralis, account, isInitialized, isWeb3Enabled } = useMoralis();
    const {
        saveJSONToIPFS,
        deliver,
        getPrice, getSupply, getCredit, getStatus, getCreator
    } = useOffer();

    const [metadata, setMetadata] = useState();
    const [order, setOrder] = useState({});
    //TODO: Make this into a hook
    const [price, setPrice] = useState();
    const [stock, setStock] = useState();
    const [credit, setCredit] = useState();
    const [creator, setCreator] = useState();
    const [status, setStatus] = useState();
    const [isSeller, setIsSeller] = useState();
    const [isBuyer, setIsBuyer] = useState();
    useEffect(() => {
        if (isWeb3Enabled) loadOnChainData();
    }, [isWeb3Enabled, account, token_id, order_id]);
    const loadOnChainData = async () => {
        const query = new Moralis.Query("mumbaiOfferOrderd").equalTo("token_id", token_id).equalTo("order_id", order_id);
        query.first().then(order => {
            setOrder(order);
            setIsBuyer(order.get('account') === account);
        });
        //Fetch onChain Data
        getPrice(token_id).then(res => setPrice(res));
        getSupply(token_id).then(res => setStock(res));
        getCredit(account, token_id).then(res => setCredit(res));
        getStatus(token_id, order_id, true).then(res => setStatus(res));
        getCreator(token_id).then(res => {
            setCreator(res.toLowerCase());
            setIsSeller(res.toLowerCase() === account)
        });
    };

    return (
        <div className="framed order">
            <h1>Order {'G' + token_id + 'G' + order_id}</h1>
            <h3>Status: {status}</h3>
            {isSeller && <div className='block'>
                <h2>Deliver</h2>
                <div className='order-delivery'>
                    <Input.TextArea
                        placeholder={"Delivery Note"}
                        autoSize={{ minRows: 6, maxRows: 6 }}
                        onChange={(evt) => setMetadata(evt.target.value)}
                    />
                    <div>[Potential Image/File Upload]</div>
                    <Button default onClick={async () => {
                        //Save to IPFS & Register Delivery URI to the Contract
                        let delivery_uri = await saveJSONToIPFS(metadata);
                        deliver(token_id, order_id, delivery_uri);
                    }} disabled={!isSeller}>Deliver</Button>
                </div>
            </div>}
        </div>
    );
} //OrderReview()

export default OrderReview;